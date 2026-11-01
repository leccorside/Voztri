<?php

namespace Tests\Feature;

use App\Domain\Ride\Services\FareCalculator;
use App\Models\Driver;
use App\Models\DriverVehicle;
use App\Models\FinancialLedger;
use App\Models\Passenger;
use App\Models\Ride;
use App\Models\RideOffer;
use App\Models\RideStatusHistory;
use App\Models\SafetyIncident;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class RideFlowTest extends TestCase
{
    use RefreshDatabase;

    // Av. Paulista -> Av. Faria Lima (as mesmas coordenadas dos apps)
    private const ORIGIN = ['address' => 'Av. Paulista, 1578 - Bela Vista', 'latitude' => -23.561414, 'longitude' => -46.655881];
    private const DESTINATION = ['address' => 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi', 'latitude' => -23.585721, 'longitude' => -46.679199];

    private function passenger(string $phone = '11911110001'): User
    {
        $user = User::create(['name' => 'Passageira Teste', 'phone' => $phone, 'role' => 'passenger', 'status' => 'active']);
        Passenger::create(['user_id' => $user->id, 'emergency_pin' => '4321']);

        return $user;
    }

    private function driver(string $phone, float $lat, float $lng, string $category = 'pop', bool $online = true): User
    {
        $user = User::create(['name' => "Motorista {$phone}", 'phone' => $phone, 'role' => 'driver', 'status' => 'active']);
        UserProfile::create(['user_id' => $user->id, 'rating_avg' => 4.80, 'total_ratings' => 10]);
        $driver = Driver::create([
            'user_id' => $user->id,
            'cnh_number' => '12345678900',
            'cnh_category' => 'B',
            'cnh_expires_at' => now()->addYears(3),
            'cnh_has_ear' => true,
            'status' => 'approved',
            'is_online' => $online,
            'current_latitude' => $lat,
            'current_longitude' => $lng,
            'pix_key' => "{$phone}@voztri.com.br",
            'pix_key_type' => 'email',
        ]);
        DriverVehicle::create([
            'driver_id' => $driver->id,
            'brand' => 'Toyota',
            'model' => 'Corolla',
            'year' => 2022,
            'color' => 'Prata',
            'plate' => 'TST' . substr($phone, -4),
            'renavam' => '12345678901',
            'category' => $category,
            'is_active' => true,
        ]);

        return $user;
    }

    private function requestRide(User $passenger, string $category = 'pop'): TestResponse
    {
        return $this->actingAs($passenger, 'sanctum')->postJson('/api/v1/rides/request', [
            'origin' => self::ORIGIN,
            'destination' => self::DESTINATION,
            'category' => $category,
            'paymentMethod' => 'pix',
        ]);
    }

    private function current(User $driver): TestResponse
    {
        return $this->actingAs($driver, 'sanctum')->getJson('/api/v1/driver/rides/current');
    }

    public function test_request_charges_estimated_price_and_offers_to_nearest_driver(): void
    {
        $near = $this->driver('11922220001', -23.5620, -46.6560); // ~100 m da origem
        $far = $this->driver('11922220002', -23.6300, -46.7400);
        $passenger = $this->passenger();

        $estimate = $this->actingAs($passenger, 'sanctum')
            ->postJson('/api/v1/rides/estimate', ['origin' => self::ORIGIN, 'destination' => self::DESTINATION])
            ->assertOk()
            ->json('0');

        $ride = $this->requestRide($passenger)
            ->assertCreated()
            ->assertJsonPath('status', 'OFFERED')
            ->assertJsonPath('priceCents', $estimate['priceCents'])
            ->assertJsonPath('origin.shortAddress', 'Av. Paulista, 1578')
            ->assertJsonPath('origin.latitude', self::ORIGIN['latitude'])
            ->json();

        $this->assertMatchesRegularExpression('/^\d{4}$/', $ride['boardingPin'], 'O passageiro vê o PIN de embarque.');

        $offer = $this->current($near)->assertOk()->json('offer');
        $this->assertSame($ride['id'], $offer['rideId']);
        $this->assertSame((new FareCalculator)->driverNetCents($estimate['priceCents']), $offer['earningsCents']);
        $this->assertSame('Passageira Teste', $offer['passengerName']);
        $this->assertIsInt($offer['secondsLeft'], 'O app exibe segundos inteiros na contagem.');
        $this->assertGreaterThan(0, $offer['secondsLeft']);
        $this->assertLessThanOrEqual(15, $offer['secondsLeft']);

        $this->current($far)->assertOk()->assertJsonPath('offer', null);
    }

    public function test_driver_never_sees_boarding_pin_and_strangers_cannot_view_ride(): void
    {
        $driver = $this->driver('11922220001', -23.5620, -46.6560);
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger)->json('id');

        $this->actingAs($driver, 'sanctum')->getJson("/api/v1/rides/{$rideId}")
            ->assertOk()
            ->assertJsonPath('boardingPin', null);

        $stranger = $this->passenger('11911110099');
        $this->actingAs($stranger, 'sanctum')->getJson("/api/v1/rides/{$rideId}")->assertForbidden();
    }

    public function test_rejected_offer_goes_to_next_driver_then_back_to_searching(): void
    {
        $a = $this->driver('11922220001', -23.5620, -46.6560);
        $b = $this->driver('11922220002', -23.5700, -46.6600);
        $rideId = $this->requestRide($this->passenger())->json('id');

        $this->actingAs($a, 'sanctum')->postJson("/api/v1/rides/{$rideId}/reject")->assertOk();
        $this->current($b)->assertJsonPath('offer.rideId', $rideId);
        $this->current($a)->assertJsonPath('offer', null);

        $this->actingAs($b, 'sanctum')->postJson("/api/v1/rides/{$rideId}/reject")->assertOk();
        $this->assertSame('SEARCHING', Ride::find($rideId)->status, 'Sem mais motoristas, a corrida volta a procurar.');
        $this->assertSame(2, RideOffer::where('ride_id', $rideId)->where('status', 'rejected')->count());
    }

    public function test_expired_offer_moves_to_next_driver_on_passenger_polling(): void
    {
        $this->driver('11922220001', -23.5620, -46.6560);
        $b = $this->driver('11922220002', -23.5700, -46.6600);
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger)->json('id');

        $this->travel(16)->seconds();

        $this->actingAs($passenger, 'sanctum')->getJson("/api/v1/rides/{$rideId}")->assertJsonPath('status', 'OFFERED');
        $this->current($b)->assertJsonPath('offer.rideId', $rideId);
        $this->assertSame(1, RideOffer::where('ride_id', $rideId)->where('status', 'expired')->count());
    }

    public function test_full_ride_flow_with_pin_ledger_earnings_and_rating(): void
    {
        $driver = $this->driver('11922220001', -23.5620, -46.6560);
        $other = $this->driver('11922220002', -23.5700, -46.6600, 'black');
        $passenger = $this->passenger();

        $ride = $this->requestRide($passenger)->json();
        $rideId = $ride['id'];
        $pin = $ride['boardingPin'];

        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")
            ->assertOk()
            ->assertJsonPath('status', 'DRIVER_EN_ROUTE')
            ->assertJsonPath('boardingPin', null)
            ->assertJsonPath('driver.vehicle.plate', 'TST0001');

        // Motorista atual aparece na corrida ativa
        $this->current($driver)->assertJsonPath('ride.id', $rideId)->assertJsonPath('offer', null);

        // Só o motorista atribuído valida o PIN, e o PIN precisa estar certo
        $this->actingAs($other, 'sanctum')->postJson("/api/v1/rides/{$rideId}/validate-pin", ['pin' => $pin])->assertForbidden();
        $wrong = $pin === '0000' ? '1111' : '0000';
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/validate-pin", ['pin' => $wrong])
            ->assertStatus(422)->assertJsonPath('error', 'INVALID_PIN');

        // Não conclui antes de iniciar
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/complete")->assertStatus(409);

        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/validate-pin", ['pin' => $pin])
            ->assertOk()->assertJsonPath('status', 'IN_PROGRESS');

        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/complete")
            ->assertOk()->assertJsonPath('status', 'COMPLETED');

        // Ledger: líquido do motorista + comissão
        $net = (new FareCalculator)->driverNetCents($ride['priceCents']);
        $this->assertSame($net, (int) FinancialLedger::where('account_type', 'driver_balance')->sum('amount_cents'));
        $this->assertSame($ride['priceCents'] - $net, (int) FinancialLedger::where('account_type', 'platform_revenue')->sum('amount_cents'));

        // Histórico completo da máquina de estados (HasUuids gera UUIDv7, ordenável por criação)
        $this->assertSame(
            ['SEARCHING', 'OFFERED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED'],
            RideStatusHistory::where('ride_id', $rideId)->orderBy('id')->pluck('to_status')->all(),
        );

        // Ganhos do motorista (líquidos) no dia e no gráfico da semana
        $earnings = $this->actingAs($driver, 'sanctum')->getJson('/api/v1/driver/earnings')->assertOk()->json();
        $this->assertSame($net, $earnings['todayCents']);
        $this->assertSame(1, $earnings['ridesCount']);
        $this->assertSame($net, $earnings['availableBalanceCents']);
        $today = collect($earnings['daily'])->firstWhere('isToday', true);
        $this->assertSame($net, $today['cents']);
        $this->assertCount(7, $earnings['daily']);

        // Avaliação: atualiza a média e não pode repetir
        $this->actingAs($passenger, 'sanctum')->postJson('/api/v1/billing/rating', ['rideId' => $rideId, 'rating' => 1])->assertOk();
        $this->assertEqualsWithDelta(4.45, (float) UserProfile::where('user_id', $driver->id)->value('rating_avg'), 0.01);
        $this->actingAs($passenger, 'sanctum')->postJson('/api/v1/billing/rating', ['rideId' => $rideId, 'rating' => 5])->assertStatus(409);
    }

    public function test_status_history_is_recorded_in_order(): void
    {
        $driver = $this->driver('11922220001', -23.5620, -46.6560);
        $ride = $this->requestRide($this->passenger())->json();
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$ride['id']}/accept")->assertOk();

        $this->assertSame(
            ['SEARCHING', 'OFFERED', 'ACCEPTED', 'DRIVER_EN_ROUTE'],
            RideStatusHistory::where('ride_id', $ride['id'])->orderBy('id')->pluck('to_status')->all(),
        );
    }

    public function test_guards_against_invalid_actions(): void
    {
        $driver = $this->driver('11922220001', -23.5620, -46.6560);
        $intruder = $this->driver('11922220002', -23.5700, -46.6600, 'black');
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger)->json('id');

        // Motorista sem oferta não aceita
        $this->actingAs($intruder, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")->assertForbidden();
        // Motorista não solicita corrida
        $this->requestRide($driver)->assertForbidden();
        // Passageiro não pede segunda corrida com uma em andamento
        $this->requestRide($passenger)->assertStatus(409)->assertJsonPath('error', 'RIDE_ALREADY_ACTIVE');
        // Estranho não cancela
        $this->actingAs($intruder, 'sanctum')->postJson("/api/v1/rides/{$rideId}/cancel", ['reason' => 'teste'])->assertForbidden();
    }

    public function test_passenger_cancel_withdraws_pending_offer(): void
    {
        $driver = $this->driver('11922220001', -23.5620, -46.6560);
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger)->json('id');

        $this->actingAs($passenger, 'sanctum')->postJson("/api/v1/rides/{$rideId}/cancel", ['reason' => 'Mudei de ideia'])
            ->assertOk()->assertJsonPath('status', 'CANCELLED');

        $this->current($driver)->assertJsonPath('offer', null);
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")->assertForbidden();
    }

    public function test_ride_waits_when_no_driver_of_category_is_online(): void
    {
        $this->driver('11922220001', -23.5620, -46.6560, 'pop');
        $this->requestRide($this->passenger(), 'black')->assertCreated()->assertJsonPath('status', 'SEARCHING');
    }

    public function test_chat_is_restricted_to_participants(): void
    {
        $driver = $this->driver('11922220001', -23.5620, -46.6560);
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger)->json('id');
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/accept")->assertOk();

        $this->actingAs($passenger, 'sanctum')->postJson("/api/v1/rides/{$rideId}/chat", ['message' => 'Estou no portão'])
            ->assertCreated()->assertJsonPath('senderRole', 'passenger')->assertJsonPath('text', 'Estou no portão');
        $this->actingAs($driver, 'sanctum')->postJson("/api/v1/rides/{$rideId}/chat", ['message' => 'Chegando'])
            ->assertCreated()->assertJsonPath('senderRole', 'driver');

        $this->actingAs($passenger, 'sanctum')->getJson("/api/v1/rides/{$rideId}/chat")
            ->assertOk()->assertJsonCount(2)->assertJsonPath('0.text', 'Estou no portão');

        $stranger = $this->passenger('11911110099');
        $this->actingAs($stranger, 'sanctum')->getJson("/api/v1/rides/{$rideId}/chat")->assertForbidden();
    }

    public function test_sos_is_triggered_and_cancelled_with_emergency_pin(): void
    {
        $passenger = $this->passenger();
        $rideId = $this->requestRide($passenger)->json('id');

        $this->actingAs($passenger, 'sanctum')
            ->postJson("/api/v1/rides/{$rideId}/sos", ['latitude' => -23.56, 'longitude' => -46.65])
            ->assertOk()->assertJsonStructure(['incidentId']);

        $this->actingAs($passenger, 'sanctum')->postJson("/api/v1/rides/{$rideId}/sos/cancel", ['emergencyPin' => '0000'])->assertStatus(422);
        $this->actingAs($passenger, 'sanctum')->postJson("/api/v1/rides/{$rideId}/sos/cancel", ['emergencyPin' => '4321'])->assertOk();

        $this->assertSame('resolved', SafetyIncident::where('ride_id', $rideId)->value('status'));
    }

    public function test_driver_status_and_payout_rules(): void
    {
        $driver = $this->driver('11922220001', -23.5620, -46.6560, 'pop', false);

        $this->actingAs($driver, 'sanctum')->postJson('/api/v1/driver/status', ['isOnline' => true])
            ->assertOk()->assertJsonPath('isOnline', true);

        Driver::where('user_id', $driver->id)->update(['status' => 'blocked', 'is_online' => false]);
        $this->actingAs($driver, 'sanctum')->postJson('/api/v1/driver/status', ['isOnline' => true])->assertForbidden();

        // Sem saldo, o repasse é recusado
        $this->actingAs($driver, 'sanctum')->postJson('/api/v1/billing/payout', [
            'amountCents' => 5000, 'pixKey' => 'x@voztri.com.br', 'pixKeyType' => 'email',
        ])->assertStatus(422)->assertJsonPath('error', 'INSUFFICIENT_BALANCE');
    }
}
