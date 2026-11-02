<?php

namespace Tests\Feature;

use App\Models\Passenger;
use App\Models\SafetyIncident;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EmergencyPinTest extends TestCase
{
    use RefreshDatabase;

    private const ORIGIN = ['address' => 'Av. Paulista, 1578 - Bela Vista', 'latitude' => -23.561414, 'longitude' => -46.655881];
    private const DESTINATION = ['address' => 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi', 'latitude' => -23.585721, 'longitude' => -46.679199];

    /** Passageiro novo, como sai do login por OTP (sem PIN). */
    private function passenger(string $phone = '11911110001'): User
    {
        $user = User::create(['name' => 'Beatriz', 'phone' => $phone, 'role' => 'passenger', 'status' => 'active']);
        Passenger::create(['user_id' => $user->id]);

        return $user;
    }

    private function setPin(User $u, string $pin, ?string $current = null)
    {
        return $this->actingAs($u, 'sanctum')->putJson('/api/v1/passenger/emergency-pin', array_filter([
            'pin' => $pin,
            'currentPin' => $current,
        ], fn ($v) => $v !== null));
    }

    private function requestRide(User $u)
    {
        return $this->actingAs($u, 'sanctum')->postJson('/api/v1/rides/request', [
            'origin' => self::ORIGIN,
            'destination' => self::DESTINATION,
            'category' => 'pop',
            'paymentMethod' => 'pix',
        ]);
    }

    public function test_new_passenger_from_otp_login_has_no_pin_and_api_never_exposes_it(): void
    {
        $this->postJson('/api/v1/auth/request-otp', ['phone' => '11911110001', 'role' => 'passenger'])->assertOk();
        $u = User::where('phone', '11911110001')->firstOrFail();
        $this->assertNull(DB::table('passengers')->where('user_id', $u->id)->value('emergency_pin'), 'Nada de 1234 padrão.');

        $code = $u->fresh()->otp_code;
        $this->postJson('/api/v1/auth/verify-otp', ['phone' => '11911110001', 'code' => $code])
            ->assertOk()->assertJsonPath('user.has_emergency_pin', false);
        $this->actingAs($u, 'sanctum')->getJson('/api/v1/auth/me')->assertJsonPath('has_emergency_pin', false);

        $this->setPin($u, '2580')->assertOk()->assertExactJson(['hasEmergencyPin' => true]);

        $me = $this->actingAs($u, 'sanctum')->getJson('/api/v1/auth/me')->assertJsonPath('has_emergency_pin', true);
        $me->assertJsonMissingPath('passenger.emergency_pin');
        $this->assertStringNotContainsString('2580', $me->getContent());
        $this->actingAs($u, 'sanctum')->getJson('/api/v1/passenger/emergency-pin')->assertExactJson(['hasEmergencyPin' => true]);
    }

    public function test_pin_is_stored_hashed(): void
    {
        $u = $this->passenger();
        $this->setPin($u, '2580')->assertOk();

        $stored = DB::table('passengers')->where('user_id', $u->id)->value('emergency_pin');
        $this->assertNotSame('2580', $stored);
        $this->assertTrue(Hash::check('2580', $stored));
    }

    public function test_pin_must_have_four_digits_and_not_be_easy_to_guess(): void
    {
        $u = $this->passenger();

        foreach (['123', '12345', '12a4', '', ' 258'] as $bad) {
            $this->setPin($u, $bad)->assertStatus(422)->assertJsonValidationErrors(['pin']);
        }
        $this->travel(61)->seconds(); // a rota aceita 10 pedidos por minuto
        foreach (['0000', '7777', '1234', '6789', '4321', '9876'] as $weak) {
            $this->setPin($u, $weak)->assertStatus(422)->assertJsonPath('error', 'WEAK_EMERGENCY_PIN');
        }
        // Parecidos com sequência, mas não são: aceitos
        $this->setPin($u, '1235')->assertOk();
        $this->assertFalse(Passenger::isWeakEmergencyPin('2468'));
        $this->assertFalse(Passenger::isWeakEmergencyPin('1122'));
    }

    public function test_changing_requires_the_current_pin_with_a_limit_of_attempts(): void
    {
        $u = $this->passenger();
        $this->setPin($u, '2580')->assertOk();

        $this->setPin($u, '3691')->assertStatus(422)->assertJsonValidationErrors(['currentPin']);
        $this->setPin($u, '3691', '1111')->assertStatus(422)->assertJsonPath('error', 'INVALID_EMERGENCY_PIN');
        $this->setPin($u, '3691', '2580')->assertOk();
        $this->assertTrue(Passenger::where('user_id', $u->id)->first()->checkEmergencyPin('3691'));

        // 5 erros bloqueiam a troca, mesmo com o PIN certo depois
        foreach (range(1, 5) as $i) {
            $this->setPin($u, '1470', '0000')->assertStatus(422);
        }
        $this->setPin($u, '1470', '3691')->assertStatus(429)->assertJsonPath('error', 'TOO_MANY_ATTEMPTS');
        $this->assertTrue(Passenger::where('user_id', $u->id)->first()->checkEmergencyPin('3691'), 'O PIN não mudou.');

        $this->travel(16)->minutes();
        $this->setPin($u, '1470', '3691')->assertOk();
    }

    public function test_ride_request_requires_a_pin_but_an_active_ride_is_still_returned(): void
    {
        $u = $this->passenger();
        $this->requestRide($u)->assertStatus(409)->assertJsonPath('error', 'EMERGENCY_PIN_REQUIRED');

        $this->setPin($u, '2580')->assertOk();
        $rideId = $this->requestRide($u)->assertCreated()->json('id');

        // Corrida antiga em andamento e PIN apagado (passageiros de antes da mudança): retoma a corrida
        DB::table('passengers')->where('user_id', $u->id)->update(['emergency_pin' => null]);
        $this->requestRide($u)->assertStatus(409)->assertJsonPath('error', 'RIDE_ALREADY_ACTIVE')->assertJsonPath('ride.id', $rideId);
    }

    public function test_sos_cancel_is_blocked_after_five_wrong_pins_and_the_alert_stays_active(): void
    {
        $u = $this->passenger();
        $this->setPin($u, '2580')->assertOk();
        $rideId = $this->requestRide($u)->assertCreated()->json('id');
        $this->actingAs($u, 'sanctum')->postJson("/api/v1/rides/{$rideId}/sos", ['latitude' => -23.56, 'longitude' => -46.65])->assertOk();

        foreach (range(1, 5) as $i) {
            $this->actingAs($u, 'sanctum')->postJson("/api/v1/rides/{$rideId}/sos/cancel", ['emergencyPin' => sprintf('%04d', $i)])
                ->assertStatus(422)->assertJsonPath('error', 'INVALID_EMERGENCY_PIN');
        }
        $this->actingAs($u, 'sanctum')->postJson("/api/v1/rides/{$rideId}/sos/cancel", ['emergencyPin' => '2580'])
            ->assertStatus(429)->assertJsonPath('error', 'TOO_MANY_ATTEMPTS');
        $this->assertSame('active', SafetyIncident::where('ride_id', $rideId)->value('status'));

        $this->travel(16)->minutes();
        $this->actingAs($u, 'sanctum')->postJson("/api/v1/rides/{$rideId}/sos/cancel", ['emergencyPin' => '2580'])->assertOk();
        $this->assertSame('resolved', SafetyIncident::where('ride_id', $rideId)->value('status'));
    }

    public function test_only_passengers_and_drivers_get_no_pin_field(): void
    {
        $this->getJson('/api/v1/passenger/emergency-pin')->assertUnauthorized();

        $driver = User::create(['name' => 'Carlos', 'phone' => '11922220001', 'role' => 'driver', 'status' => 'active']);
        $this->actingAs($driver, 'sanctum')->putJson('/api/v1/passenger/emergency-pin', ['pin' => '2580'])->assertForbidden();
        $this->actingAs($driver, 'sanctum')->getJson('/api/v1/auth/me')->assertJsonMissingPath('has_emergency_pin');
    }
}
