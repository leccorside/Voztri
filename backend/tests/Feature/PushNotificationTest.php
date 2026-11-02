<?php

namespace Tests\Feature;

use App\Infrastructure\Push\FcmPushNotifier;
use App\Infrastructure\Push\NullPushNotifier;
use App\Infrastructure\Push\PushMessage;
use App\Infrastructure\Push\PushNotifier;
use App\Jobs\ExpireRideSearch;
use App\Jobs\SendRideOfferPush;
use App\Jobs\SendRideStatusPush;
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

    // ------------------------------------------------------------ passageiro

    public function test_accept_pushes_driver_en_route_to_passenger(): void
    {
        $driver = $this->driver('11922220001');
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger);
        $this->assertCount(0, $this->push->messagesFor($passenger), 'Nada antes do aceite.');

        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")->assertOk();

        $messages = $this->push->messagesFor($passenger);
        $this->assertCount(1, $messages, 'Aceite e "a caminho" viram uma notificação só.');
        $msg = $messages[0];
        $this->assertSame('Motorista está a caminho', $msg->title);
        $this->assertSame('Toyota Corolla Prata • PSH0001 • chega em ~4 min', $msg->body);
        $this->assertSame(['type' => 'ride_status', 'rideId' => $rideId, 'status' => 'DRIVER_EN_ROUTE'], $msg->data);
        $this->assertSame('ride_updates', $msg->androidChannel);
        $this->assertSame("ride_{$rideId}", $msg->tag);
        $this->assertTrue($msg->urgent);
    }

    public function test_driver_arrival_pushes_once_and_pin_still_starts_trip(): void
    {
        $driver = $this->driver('11922220001');
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger);
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")->assertOk();

        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived")
            ->assertOk()->assertJsonPath('status', 'DRIVER_ARRIVED');
        // Repetir (toque duplo, nova tentativa de rede) não reenvia
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived")->assertOk();

        $messages = $this->push->messagesFor($passenger);
        $this->assertCount(2, $messages);
        $this->assertSame('Seu motorista chegou', $messages[1]->title);
        $this->assertSame('Motorista está no embarque: Toyota Corolla Prata • PSH0001. Confira a placa antes de entrar.', $messages[1]->body);
        $this->assertSame('DRIVER_ARRIVED', $messages[1]->data['status']);
        $this->assertSame($messages[0]->tag, $messages[1]->tag, 'A chegada substitui o "a caminho".');

        $this->assertDatabaseHas('ride_status_history', ['ride_id' => $rideId, 'from_status' => 'DRIVER_EN_ROUTE', 'to_status' => 'DRIVER_ARRIVED']);

        $pin = \App\Models\Ride::findOrFail($rideId)->boarding_pin;
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/validate-pin", ['pin' => $pin])
            ->assertOk()->assertJsonPath('status', 'IN_PROGRESS');
        $this->assertCount(2, $this->push->messagesFor($passenger), 'Embarque não gera push.');
    }

    public function test_arrival_requires_assigned_driver_en_route(): void
    {
        $driver = $this->driver('11922220001');
        $other = $this->driver('11922220002', -23.70, -46.80);
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger);

        // Ainda não aceita
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived")->assertForbidden();

        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")->assertOk();
        $this->actingAs($other, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived")->assertForbidden();
        $this->actingAs($passenger, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived")->assertForbidden();

        $pin = \App\Models\Ride::findOrFail($rideId)->boarding_pin;
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/validate-pin", ['pin' => $pin])->assertOk();
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived")
            ->assertStatus(409)->assertJsonPath('error', 'INVALID_STATE');

        $this->assertCount(1, $this->push->messagesFor($passenger));
    }

    public function test_status_push_skips_changed_ride_and_omits_stale_eta(): void
    {
        $driverUser = $this->driver('11922220001');
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger);
        $this->actingAs($driverUser, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")->assertOk();
        $this->push->sent = [];
        $fares = app(\App\Domain\Ride\Services\FareCalculator::class);

        // Posição do motorista velha: sem estimativa de chegada
        Driver::where('user_id', $driverUser->id)->update(['last_location_at' => now()->subHour()]);
        (new SendRideStatusPush($rideId, SendRideStatusPush::EN_ROUTE))->handle($this->push, $fares);
        $this->assertSame('Toyota Corolla Prata • PSH0001 • motorista confirmado', $this->push->messagesFor($passenger)[0]->body);

        // Cancelada antes de o job rodar: não avisa
        $this->actingAs($passenger, 'sanctum')->postJson("/api/v1/rides/{$rideId}/cancel", ['reason' => 'Mudei de ideia'])->assertOk();
        (new SendRideStatusPush($rideId, SendRideStatusPush::EN_ROUTE))->handle($this->push, $fares);
        (new SendRideStatusPush($rideId, SendRideStatusPush::ARRIVED))->handle($this->push, $fares);
        $this->assertCount(1, $this->push->messagesFor($passenger));
    }

    // ------------------------------------------------------------ cancelamento e conclusão

    public function test_driver_cancellation_pushes_passenger_without_reason(): void
    {
        [$driver, $passenger, $rideId] = $this->rideEnRoute();

        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/cancel", ['reason' => 'Pneu furou na Rebouças'])
            ->assertOk()->assertJsonPath('status', 'CANCELLED');

        $messages = $this->push->messagesFor($passenger);
        $this->assertCount(2, $messages);
        $msg = $messages[1];
        $this->assertSame('Corrida cancelada pelo motorista', $msg->title);
        $this->assertSame('Motorista cancelou a corrida. Toque para pedir outro motorista.', $msg->body);
        $this->assertStringNotContainsString('Pneu', $msg->body, 'O motivo digitado não vai na notificação.');
        $this->assertSame(['type' => 'ride_status', 'rideId' => $rideId, 'status' => 'CANCELLED'], $msg->data);
        $this->assertSame($messages[0]->tag, $msg->tag, 'Substitui o "a caminho".');
        $this->assertTrue($msg->urgent);
        $this->assertSame(1800, $msg->ttlSeconds);
        // O motorista só recebeu a oferta; o cancelamento dele não gera push para ele
        $this->assertSame(['ride_offer'], array_map(fn ($m) => $m->data['type'], $this->push->messagesFor($driver)));
    }

    public function test_passenger_cancellation_does_not_push(): void
    {
        [, $passenger, $rideId] = $this->rideEnRoute();

        $this->actingAs($passenger, 'sanctum')->postJson("/api/v1/rides/{$rideId}/cancel", ['reason' => 'Mudei de ideia'])->assertOk();
        $this->assertCount(1, $this->push->messagesFor($passenger), 'Só o "a caminho".');

        // Mesmo que o job rode (ex.: disparado por engano), ele confere quem cancelou
        (new SendRideStatusPush($rideId, SendRideStatusPush::CANCELLED))->handle($this->push, app(\App\Domain\Ride\Services\FareCalculator::class));
        $this->assertCount(1, $this->push->messagesFor($passenger));
    }

    public function test_completion_pushes_total_and_rating_invite(): void
    {
        [$driver, $passenger, $rideId] = $this->rideEnRoute();
        $ride = \App\Models\Ride::findOrFail($rideId);
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/validate-pin", ['pin' => $ride->boarding_pin])->assertOk();

        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/complete")->assertOk();

        $messages = $this->push->messagesFor($passenger);
        $this->assertCount(2, $messages, 'A caminho e concluída (o embarque não gera push).');
        $msg = $messages[1];
        $total = \App\Domain\Ride\Services\FareCalculator::format((int) $ride->final_price_cents);
        $this->assertSame('Viagem concluída', $msg->title);
        $this->assertSame("Total: {$total} no Pix. Toque para avaliar Motorista.", $msg->body);
        $this->assertSame('COMPLETED', $msg->data['status']);
        $this->assertFalse($msg->urgent, 'Conclusão em prioridade normal.');
        $this->assertSame(86400, $msg->ttlSeconds);
        $this->assertSame("ride_{$rideId}", $msg->tag);
    }

    public function test_completion_body_uses_payment_preposition(): void
    {
        [$driver, $passenger, $rideId] = $this->rideEnRoute();
        \App\Models\Ride::whereKey($rideId)->update(['status' => 'COMPLETED', 'payment_method' => 'cash']);

        (new SendRideStatusPush($rideId, SendRideStatusPush::COMPLETED))->handle($this->push, app(\App\Domain\Ride\Services\FareCalculator::class));

        $this->assertStringContainsString(' em dinheiro. Toque para avaliar Motorista.', $this->push->messagesFor($passenger)[1]->body);
    }

    // ------------------------------------------------------------ timeout da busca

    private function getRide(User $user, string $rideId)
    {
        return $this->actingAs($user, 'sanctum')->getJson("/api/v1/rides/{$rideId}")->assertOk();
    }

    private function runExpireJob(string $rideId): void
    {
        (new ExpireRideSearch($rideId))->handle(app(\App\Domain\Ride\Services\RideDispatcher::class));
    }

    public function test_search_without_driver_times_out_after_3_minutes_with_push(): void
    {
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger); // nenhum motorista online

        $this->travel(179)->seconds();
        $this->getRide($passenger, $rideId)->assertJsonPath('status', 'SEARCHING');

        $this->travel(2)->seconds();
        $this->getRide($passenger, $rideId)->assertJsonPath('status', 'NO_DRIVER_AVAILABLE');

        $messages = $this->push->messagesFor($passenger);
        $this->assertCount(1, $messages);
        $this->assertSame('Nenhum motorista disponível', $messages[0]->title);
        $this->assertSame('Não encontramos um motorista VozTri Pop perto de Av. Paulista, 1578. Toque para tentar de novo.', $messages[0]->body);
        $this->assertSame(['type' => 'ride_status', 'rideId' => $rideId, 'status' => 'NO_DRIVER_AVAILABLE'], $messages[0]->data);
        $this->assertSame("ride_{$rideId}", $messages[0]->tag);
        $this->assertTrue($messages[0]->urgent);

        $history = \App\Models\RideStatusHistory::where('ride_id', $rideId)->where('to_status', 'NO_DRIVER_AVAILABLE')->firstOrFail();
        $this->assertSame(['reason' => 'search_timeout', 'timeout_seconds' => 180], $history->metadata);

        // Polling e job seguintes não repetem a transição nem o push
        $this->getRide($passenger, $rideId)->assertJsonPath('status', 'NO_DRIVER_AVAILABLE');
        $this->runExpireJob($rideId);
        $this->assertCount(1, $this->push->messagesFor($passenger));
    }

    public function test_ride_exposes_search_deadline_only_while_searching(): void
    {
        $passenger = $this->passenger();
        $res = $this->actingAs($passenger, 'sanctum')->postJson('/api/v1/rides/request', [
            'origin' => ['address' => 'Av. Paulista, 1578 - Bela Vista', 'latitude' => -23.561414, 'longitude' => -46.655881],
            'destination' => ['address' => 'Av. Faria Lima, 3477 - Itaim Bibi', 'latitude' => -23.585721, 'longitude' => -46.679199],
            'category' => 'pop',
            'paymentMethod' => 'pix',
        ])->assertCreated();

        // Prazo = createdAt + 3 min, no mesmo formato ISO 8601
        $created = \Carbon\Carbon::parse($res->json('createdAt'));
        $this->assertSame('SEARCHING', $res->json('status'));
        $this->assertSame($created->copy()->addSeconds(180)->toIso8601String(), $res->json('searchExpiresAt'));
        $rideId = $res->json('id');

        // Com oferta em andamento continua; aceita, deixa de existir
        $driver = $this->driver('11922220001');
        $this->getRide($passenger, $rideId)->assertJsonPath('status', 'OFFERED')
            ->assertJsonPath('searchExpiresAt', $res->json('searchExpiresAt'));
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")->assertOk()
            ->assertJsonPath('searchExpiresAt', null);
        $this->getRide($passenger, $rideId)->assertJsonPath('searchExpiresAt', null);
    }

    public function test_search_deadline_kept_when_search_ends_without_driver(): void
    {
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger);
        $expiresAt = $this->getRide($passenger, $rideId)->json('searchExpiresAt');

        $this->travel(181)->seconds();
        // Mantido no NO_DRIVER_AVAILABLE: o app mostra quanto tempo a busca durou
        $this->getRide($passenger, $rideId)->assertJsonPath('status', 'NO_DRIVER_AVAILABLE')
            ->assertJsonPath('searchExpiresAt', $expiresAt);
    }

    public function test_expire_job_ends_search_without_any_polling(): void
    {
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger);

        // Antes do prazo (fila sem atraso): não mexe na corrida
        $this->runExpireJob($rideId);
        $this->assertSame('SEARCHING', $this->rideStatus($rideId));

        $this->travel(181)->seconds();
        $this->runExpireJob($rideId);
        $this->assertSame('NO_DRIVER_AVAILABLE', $this->rideStatus($rideId));
        $this->assertCount(1, $this->push->messagesFor($passenger));
    }

    public function test_offer_in_progress_at_deadline_is_not_interrupted(): void
    {
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger);

        // Um motorista fica online aos 2:55 e recebe a oferta (vale até 3:10)
        $this->travel(175)->seconds();
        $driver = $this->driver('11922220001');
        $this->getRide($passenger, $rideId)->assertJsonPath('status', 'OFFERED');

        // 3:01: prazo vencido, mas a oferta segue válida
        $this->travel(6)->seconds();
        $this->runExpireJob($rideId);
        $this->getRide($passenger, $rideId)->assertJsonPath('status', 'OFFERED');

        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")->assertOk()->assertJsonPath('status', 'DRIVER_EN_ROUTE');
        $this->runExpireJob($rideId);
        $this->assertSame('DRIVER_EN_ROUTE', $this->rideStatus($rideId));
        $this->assertSame(['DRIVER_EN_ROUTE'], array_map(fn ($m) => $m->data['status'], $this->push->messagesFor($passenger)));
    }

    public function test_rejection_or_expiry_after_deadline_ends_search(): void
    {
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger);
        $this->travel(175)->seconds();
        $a = $this->driver('11922220001');
        $this->driver('11922220002', -23.5700, -46.6600); // outro motorista livre, que não recebe a corrida
        $this->getRide($passenger, $rideId)->assertJsonPath('status', 'OFFERED');

        // Recusa depois do prazo: não vai ao próximo motorista
        $this->travel(6)->seconds();
        $this->actingAs($a, 'sanctum')->postJson("/api/v1/rides/{$rideId}/reject")->assertOk();
        $this->assertSame('NO_DRIVER_AVAILABLE', $this->rideStatus($rideId));
        $this->assertSame(1, RideOffer::where('ride_id', $rideId)->count());
        $this->assertSame(['NO_DRIVER_AVAILABLE'], array_map(fn ($m) => $m->data['status'], $this->push->messagesFor($passenger)));
    }

    public function test_offer_expiring_after_deadline_ends_search_via_job(): void
    {
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger);
        $this->travel(175)->seconds();
        $this->driver('11922220001');
        $this->getRide($passenger, $rideId)->assertJsonPath('status', 'OFFERED');

        // Ninguém faz polling; a oferta vence aos 3:10 e o job confere de novo
        $this->travel(16)->seconds();
        $this->runExpireJob($rideId);
        $this->assertSame('NO_DRIVER_AVAILABLE', $this->rideStatus($rideId));
        $this->assertSame('expired', RideOffer::where('ride_id', $rideId)->value('status'));
        $this->assertCount(1, $this->push->messagesFor($passenger));
    }

    public function test_cancelled_search_is_left_alone_by_the_job(): void
    {
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger);
        $this->actingAs($passenger, 'sanctum')->postJson("/api/v1/rides/{$rideId}/cancel", ['reason' => 'Mudei de ideia'])->assertOk();

        $this->travel(181)->seconds();
        $this->runExpireJob($rideId);
        $this->assertSame('CANCELLED', $this->rideStatus($rideId));
        $this->assertCount(0, $this->push->messagesFor($passenger));
    }

    // ------------------------------------------------------------ chegada pela posição

    /** Embarque dos testes: Av. Paulista, 1578 (-23.561414, -46.655881); 0,001° de latitude ≈ 111 m. */
    private const PICKUP_LAT = -23.561414;
    private const PICKUP_LNG = -46.655881;

    /** Motorista a ~1,1 km do embarque, com a corrida aceita (a caminho). */
    private function rideEnRoute(): array
    {
        $driver = $this->driver('11922220001', -23.5714, -46.6559);
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger);
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")->assertOk();

        return [$driver, $passenger, $rideId];
    }

    /** @param float|null $accuracy raio de incerteza do GPS (m); null = não enviado */
    private function sendLocation(User $driver, float $lat, float $lng = self::PICKUP_LNG, ?float $accuracy = 10)
    {
        $body = ['latitude' => $lat, 'longitude' => $lng] + ($accuracy !== null ? ['accuracy' => $accuracy] : []);

        return $this->actingAs($driver, 'sanctum')->postJson('/api/v1/driver/location', $body)->assertOk();
    }

    private function rideStatus(string $rideId): string
    {
        return \App\Models\Ride::findOrFail($rideId)->status;
    }

    public function test_location_within_100m_marks_arrival_and_pushes_once(): void
    {
        [$driver, $passenger, $rideId] = $this->rideEnRoute();

        // ~200 m: ainda não chegou
        $this->sendLocation($driver, self::PICKUP_LAT - 0.0018)->assertJson(['arrivedAtPickup' => false, 'rideId' => null]);
        $this->assertSame('DRIVER_EN_ROUTE', $this->rideStatus($rideId));

        // ~50 m: chegada automática
        $this->sendLocation($driver, self::PICKUP_LAT - 0.00045)->assertJson(['arrivedAtPickup' => true, 'rideId' => $rideId]);
        $this->assertSame('DRIVER_ARRIVED', $this->rideStatus($rideId));

        $history = \App\Models\RideStatusHistory::where('ride_id', $rideId)->where('to_status', 'DRIVER_ARRIVED')->firstOrFail();
        $this->assertSame('auto', $history->metadata['source']);
        $this->assertEqualsWithDelta(50, $history->metadata['distance_m'], 3);
        $this->assertSame(10, $history->metadata['accuracy_m']);

        // Posições seguintes (parado no embarque) não repetem a chegada nem o push
        $this->sendLocation($driver, self::PICKUP_LAT - 0.0002)->assertJson(['arrivedAtPickup' => false]);
        $messages = $this->push->messagesFor($passenger);
        $this->assertCount(2, $messages);
        $this->assertSame(['Motorista está a caminho', 'Seu motorista chegou'], array_map(fn ($m) => $m->title, $messages));
    }

    public function test_auto_arrival_requires_distance_plus_accuracy_within_100m(): void
    {
        [$driver, $passenger, $rideId] = $this->rideEnRoute();
        $near = self::PICKUP_LAT - 0.00045; // ~50 m do embarque

        // 50 m + 60 m de incerteza = 110 m: o motorista pode estar fora do raio
        $this->sendLocation($driver, $near, accuracy: 60)->assertJson(['arrivedAtPickup' => false]);
        // Sem precisão não há como garantir; precisão maior que o raio, nunca
        $this->sendLocation($driver, $near, accuracy: null)->assertJson(['arrivedAtPickup' => false]);
        $this->sendLocation($driver, self::PICKUP_LAT, accuracy: 150)->assertJson(['arrivedAtPickup' => false]);
        // No embarque exato, mas com 101 m de incerteza
        $this->sendLocation($driver, self::PICKUP_LAT, accuracy: 101)->assertJson(['arrivedAtPickup' => false]);
        $this->assertSame('DRIVER_EN_ROUTE', $this->rideStatus($rideId));
        $this->assertCount(1, $this->push->messagesFor($passenger));

        // Precisão inválida é recusada pela validação
        $this->actingAs($driver, 'sanctum')->postJson('/api/v1/driver/location', [
            'latitude' => $near, 'longitude' => self::PICKUP_LNG, 'accuracy' => -1,
        ])->assertStatus(422)->assertJsonValidationErrors(['accuracy']);

        // 50 m + 45 m = 95 m: cabe
        $this->sendLocation($driver, $near, accuracy: 45)->assertJson(['arrivedAtPickup' => true]);
        $this->assertSame('DRIVER_ARRIVED', $this->rideStatus($rideId));
        $history = \App\Models\RideStatusHistory::where('ride_id', $rideId)->where('to_status', 'DRIVER_ARRIVED')->firstOrFail();
        $this->assertSame(45, $history->metadata['accuracy_m']);
        $this->assertCount(2, $this->push->messagesFor($passenger));
    }

    public function test_location_near_pickup_without_ride_en_route_does_nothing(): void
    {
        $driver = $this->driver('11922220001', -23.5714, -46.6559);
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger); // só oferecida, ainda não aceita

        $this->sendLocation($driver, self::PICKUP_LAT)->assertJson(['arrivedAtPickup' => false]);
        $this->assertSame('OFFERED', $this->rideStatus($rideId));

        // Já em viagem: passar perto do embarque de novo não volta o status
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")->assertOk();
        $pin = \App\Models\Ride::findOrFail($rideId)->boarding_pin;
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/validate-pin", ['pin' => $pin])->assertOk();
        $this->sendLocation($driver, self::PICKUP_LAT)->assertJson(['arrivedAtPickup' => false]);
        $this->assertSame('IN_PROGRESS', $this->rideStatus($rideId));
        $this->assertCount(1, $this->push->messagesFor($passenger));
    }

    public function test_manual_arrival_rejected_when_too_far(): void
    {
        [$driver, $passenger, $rideId] = $this->rideEnRoute();

        // ~553 m (geodésico), posição enviada pelo app
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived", [
            'latitude' => self::PICKUP_LAT - 0.005, 'longitude' => self::PICKUP_LNG,
        ])->assertStatus(422)
            ->assertJsonPath('error', 'TOO_FAR_FROM_PICKUP')
            ->assertJsonPath('maxDistanceMeters', 300)
            ->assertJsonPath('message', 'Você está a 550 m do embarque. Avise a chegada quando estiver a até 300 m.');

        $this->assertSame('DRIVER_EN_ROUTE', $this->rideStatus($rideId));
        $this->assertCount(1, $this->push->messagesFor($passenger), 'Sem push de chegada.');
        // A posição enviada atualiza a do motorista
        $this->assertEqualsWithDelta(self::PICKUP_LAT - 0.005, (float) Driver::where('user_id', $driver->id)->value('current_latitude'), 1e-6);

        // Sem posição no corpo, vale a guardada (a ~1,1 km do embarque)
        Driver::where('user_id', $driver->id)->update(['current_latitude' => -23.5714, 'last_location_at' => now()]);
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived")
            ->assertStatus(422)->assertJsonPath('error', 'TOO_FAR_FROM_PICKUP')
            ->assertJsonPath('message', 'Você está a 1,1 km do embarque. Avise a chegada quando estiver a até 300 m.');
    }

    public function test_manual_arrival_within_300m_or_with_fresh_position(): void
    {
        [$driver, $passenger, $rideId] = $this->rideEnRoute();

        // Posição guardada velha e nenhuma no corpo: não dá para confirmar
        Driver::where('user_id', $driver->id)->update(['last_location_at' => now()->subMinutes(5)]);
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived")
            ->assertStatus(422)->assertJsonPath('error', 'LOCATION_REQUIRED');

        // Coordenada pela metade é recusada
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived", ['latitude' => self::PICKUP_LAT])
            ->assertStatus(422)->assertJsonValidationErrors(['longitude']);

        // ~200 m: fora do raio automático, mas dentro do manual
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived", [
            'latitude' => self::PICKUP_LAT - 0.0018, 'longitude' => self::PICKUP_LNG,
        ])->assertOk()->assertJsonPath('status', 'DRIVER_ARRIVED');

        $history = \App\Models\RideStatusHistory::where('ride_id', $rideId)->where('to_status', 'DRIVER_ARRIVED')->firstOrFail();
        $this->assertSame('manual', $history->metadata['source']);
        $this->assertEqualsWithDelta(200, $history->metadata['distance_m'], 5);

        // Repetir longe depois de chegar não falha nem reenvia
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/arrived", [
            'latitude' => self::PICKUP_LAT - 0.01, 'longitude' => self::PICKUP_LNG,
        ])->assertOk();
        $this->assertCount(2, $this->push->messagesFor($passenger));
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
