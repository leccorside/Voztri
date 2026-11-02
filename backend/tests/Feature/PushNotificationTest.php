<?php

namespace Tests\Feature;

use App\Infrastructure\Push\FcmPushNotifier;
use App\Infrastructure\Push\NullPushNotifier;
use App\Infrastructure\Push\PushMessage;
use App\Infrastructure\Push\PushNotifier;
use App\Jobs\SendRideOfferPush;
use App\Models\Driver;
use App\Models\DriverVehicle;
use App\Models\Passenger;
use App\Models\RideOffer;
use App\Models\User;
use App\Models\UserDevice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Fakes\RecordingPushNotifier;
use Tests\TestCase;

class PushNotificationTest extends TestCase
{
    use RefreshDatabase;

    private RecordingPushNotifier $push;

    protected function setUp(): void
    {
        parent::setUp();
        $this->push = new RecordingPushNotifier();
        $this->app->instance(PushNotifier::class, $this->push);
    }

    private function driver(string $phone, float $lat = -23.5620, float $lng = -46.6560): User
    {
        $user = User::create(['name' => "Motorista {$phone}", 'phone' => $phone, 'role' => 'driver', 'status' => 'active']);
        $driver = Driver::create([
            'user_id' => $user->id, 'cnh_number' => '123', 'cnh_category' => 'B', 'cnh_expires_at' => now()->addYear(),
            'cnh_has_ear' => true, 'status' => 'approved', 'is_online' => true,
            'current_latitude' => $lat, 'current_longitude' => $lng, 'last_location_at' => now(),
        ]);
        DriverVehicle::create([
            'driver_id' => $driver->id, 'brand' => 'Toyota', 'model' => 'Corolla', 'year' => 2022, 'color' => 'Prata',
            'plate' => 'PSH' . substr($phone, -4), 'renavam' => '1', 'category' => 'pop', 'is_active' => true,
        ]);

        return $user;
    }

    private function passenger(): User
    {
        $user = User::create(['name' => 'Passageira', 'phone' => '11911110001', 'role' => 'passenger', 'status' => 'active']);
        Passenger::create(['user_id' => $user->id, 'emergency_pin' => '4321']);

        return $user;
    }

    private function requestRide(User $passenger): string
    {
        return $this->actingAs($passenger, 'sanctum')->postJson('/api/v1/rides/request', [
            'origin' => ['address' => 'Av. Paulista, 1578 - Bela Vista', 'latitude' => -23.561414, 'longitude' => -46.655881],
            'destination' => ['address' => 'Av. Faria Lima, 3477 - Itaim Bibi', 'latitude' => -23.585721, 'longitude' => -46.679199],
            'category' => 'pop',
            'paymentMethod' => 'pix',
        ])->assertCreated()->json('id');
    }

    // ------------------------------------------------------------ aparelhos

    public function test_registers_updates_and_removes_device_token(): void
    {
        $driver = $this->driver('11922220001');

        $this->actingAs($driver, 'sanctum')->postJson('/api/v1/devices', ['token' => 'tok-1', 'platform' => 'android'])->assertCreated();
        $this->actingAs($driver, 'sanctum')->postJson('/api/v1/devices', ['token' => 'tok-1', 'platform' => 'android'])->assertCreated();
        $this->assertSame(1, UserDevice::where('fcm_token', 'tok-1')->count(), 'O mesmo token não duplica.');

        // Outra conta entra no mesmo aparelho: o token passa para ela
        $other = $this->driver('11922220002');
        $this->actingAs($other, 'sanctum')->postJson('/api/v1/devices', ['token' => 'tok-1', 'platform' => 'android'])->assertCreated();
        $this->assertSame($other->id, UserDevice::where('fcm_token', 'tok-1')->value('user_id'));

        $this->actingAs($other, 'sanctum')->deleteJson('/api/v1/devices', ['token' => 'tok-1'])->assertNoContent();
        $this->assertDatabaseMissing('user_devices', ['fcm_token' => 'tok-1']);

        $this->actingAs($other, 'sanctum')->postJson('/api/v1/devices', ['token' => 'x', 'platform' => 'web'])
            ->assertStatus(422)->assertJsonValidationErrors(['platform']);
    }

    // ------------------------------------------------------------ ofertas

    public function test_new_offer_pushes_to_offered_driver_only(): void
    {
        $near = $this->driver('11922220001');
        $far = $this->driver('11922220002', -23.70, -46.80);

        $rideId = $this->requestRide($this->passenger());

        $this->assertCount(0, $this->push->messagesFor($far));
        $messages = $this->push->messagesFor($near);
        $this->assertCount(1, $messages);

        $msg = $messages[0];
        $this->assertStringStartsWith('Nova corrida: R$ ', $msg->title);
        $this->assertStringContainsString('Embarque: Av. Paulista, 1578', $msg->body);
        $this->assertSame(['type' => 'ride_offer', 'rideId' => $rideId], array_intersect_key($msg->data, ['type' => 1, 'rideId' => 1]));
        $this->assertSame('ride_offers', $msg->androidChannel);
        $this->assertTrue($msg->urgent);
        $this->assertGreaterThan(0, $msg->ttlSeconds);
        $this->assertLessThanOrEqual(15, $msg->ttlSeconds);
    }

    public function test_rejected_offer_pushes_next_driver(): void
    {
        $a = $this->driver('11922220001');
        $b = $this->driver('11922220002', -23.5700, -46.6600);
        $rideId = $this->requestRide($this->passenger());

        $this->actingAs($a, 'sanctum')->postJson("/api/v1/rides/{$rideId}/reject")->assertOk();

        $this->assertCount(1, $this->push->messagesFor($a));
        $this->assertCount(1, $this->push->messagesFor($b));
    }

    public function test_job_skips_offer_already_answered_or_expired(): void
    {
        $driver = $this->driver('11922220001');
        $rideId = $this->requestRide($this->passenger());
        $offer = RideOffer::where('ride_id', $rideId)->firstOrFail();
        $this->push->sent = [];

        $offer->update(['status' => 'rejected']);
        (new SendRideOfferPush($offer->id))->handle($this->push, app(\App\Domain\Ride\Services\FareCalculator::class));

        $offer->update(['status' => 'sent', 'expires_at' => now()->subSecond()]);
        (new SendRideOfferPush($offer->id))->handle($this->push, app(\App\Domain\Ride\Services\FareCalculator::class));

        $this->assertCount(0, $this->push->messagesFor($driver));
    }

    // ------------------------------------------------------------ FCM HTTP v1

    private function fcmWithKey(): array
    {
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($key, $privatePem);
        $publicPem = openssl_pkey_get_details($key)['key'];

        $notifier = new FcmPushNotifier([
            'project_id' => 'voztri-teste',
            'client_email' => 'push@voztri-teste.iam.gserviceaccount.com',
            'private_key' => $privatePem,
            'token_uri' => 'https://oauth2.googleapis.com/token',
        ]);

        return [$notifier, $publicPem];
    }

    public function test_fcm_signs_jwt_and_sends_http_v1_payload(): void
    {
        Cache::flush();
        [$fcm, $publicPem] = $this->fcmWithKey();
        $driver = $this->driver('11922220001');
        UserDevice::create(['user_id' => $driver->id, 'platform' => 'android', 'fcm_token' => 'tok-android']);
        UserDevice::create(['user_id' => $driver->id, 'platform' => 'ios', 'fcm_token' => 'tok-ios']);

        Http::fake([
            'oauth2.googleapis.com/*' => Http::response(['access_token' => 'ya29.teste', 'expires_in' => 3599]),
            'fcm.googleapis.com/*' => Http::response(['name' => 'projects/voztri-teste/messages/1']),
        ]);

        $sent = $fcm->sendToUser($driver, new PushMessage(
            title: 'Nova corrida: R$ 15,89',
            body: 'Embarque: Av. Paulista',
            data: ['type' => 'ride_offer', 'rideId' => 'r-1'],
            ttlSeconds: 14,
            androidChannel: 'ride_offers',
            tag: 'ride_offer',
            urgent: true,
        ));
        $this->assertSame(2, $sent);

        // JWT da conta de serviço assinado com a chave privada (RS256)
        Http::assertSent(function (HttpRequest $r) use ($publicPem) {
            if (!str_contains($r->url(), 'oauth2.googleapis.com')) return false;
            [$h, $p, $s] = explode('.', $r['assertion']);
            $claims = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
            $valid = openssl_verify("{$h}.{$p}", base64_decode(strtr($s, '-_', '+/')), $publicPem, OPENSSL_ALGO_SHA256) === 1;

            return $r['grant_type'] === 'urn:ietf:params:oauth:grant-type:jwt-bearer'
                && $valid
                && $claims['iss'] === 'push@voztri-teste.iam.gserviceaccount.com'
                && $claims['scope'] === 'https://www.googleapis.com/auth/firebase.messaging'
                && $claims['exp'] - $claims['iat'] === 3600;
        });

        // Mensagem: Android com TTL e canal; iOS (APNs via FCM) com prioridade e expiração
        Http::assertSent(function (HttpRequest $r) {
            if (!str_contains($r->url(), '/v1/projects/voztri-teste/messages:send')) return false;
            $m = $r['message'];
            return $r->hasHeader('Authorization', 'Bearer ya29.teste')
                && in_array($m['token'], ['tok-android', 'tok-ios'], true)
                && $m['notification'] === ['title' => 'Nova corrida: R$ 15,89', 'body' => 'Embarque: Av. Paulista']
                && $m['data'] === ['type' => 'ride_offer', 'rideId' => 'r-1']
                && $m['android']['priority'] === 'HIGH'
                && $m['android']['ttl'] === '14s'
                && $m['android']['notification']['channel_id'] === 'ride_offers'
                && $m['apns']['headers']['apns-priority'] === '10'
                && $m['apns']['headers']['apns-collapse-id'] === 'ride_offer'
                && abs((int) $m['apns']['headers']['apns-expiration'] - (time() + 14)) <= 2
                && $m['apns']['payload']['aps']['interruption-level'] === 'time-sensitive';
        });

        // Token OAuth reaproveitado entre os envios (1 pedido para 2 aparelhos)
        Http::assertSentCount(3);
    }

    public function test_fcm_removes_unregistered_token_but_keeps_on_other_errors(): void
    {
        Cache::flush();
        [$fcm] = $this->fcmWithKey();
        $driver = $this->driver('11922220001');
        UserDevice::create(['user_id' => $driver->id, 'platform' => 'android', 'fcm_token' => 'tok-morto']);
        UserDevice::create(['user_id' => $driver->id, 'platform' => 'ios', 'fcm_token' => 'tok-instavel']);

        Http::fake([
            'oauth2.googleapis.com/*' => Http::response(['access_token' => 'ya29.teste']),
            'fcm.googleapis.com/*' => function (HttpRequest $r) {
                return $r['message']['token'] === 'tok-morto'
                    ? Http::response(['error' => ['code' => 404, 'status' => 'NOT_FOUND', 'details' => [['errorCode' => 'UNREGISTERED']]]], 404)
                    : Http::response(['error' => ['code' => 503, 'status' => 'UNAVAILABLE']], 503);
            },
        ]);

        $this->assertSame(0, $fcm->sendToUser($driver, new PushMessage('t', 'b')));
        $this->assertDatabaseMissing('user_devices', ['fcm_token' => 'tok-morto']);
        $this->assertDatabaseHas('user_devices', ['fcm_token' => 'tok-instavel']); // falha temporária
    }

    public function test_container_uses_fcm_only_with_credentials_file(): void
    {
        $this->app->forgetInstance(PushNotifier::class);
        config(['services.fcm.credentials' => null]);
        $this->assertInstanceOf(NullPushNotifier::class, app(PushNotifier::class));

        $this->app->forgetInstance(PushNotifier::class);
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($key, $pem);
        $file = tempnam(sys_get_temp_dir(), 'fcm');
        file_put_contents($file, json_encode(['project_id' => 'p', 'client_email' => 'e@p.iam.gserviceaccount.com', 'private_key' => $pem]));
        config(['services.fcm.credentials' => $file]);
        $this->assertInstanceOf(FcmPushNotifier::class, app(PushNotifier::class));
        unlink($file);
    }
}
