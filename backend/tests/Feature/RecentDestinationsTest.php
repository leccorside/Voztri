<?php

namespace Tests\Feature;

use App\Models\Passenger;
use App\Models\RecentDestination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecentDestinationsTest extends TestCase
{
    use RefreshDatabase;

    private const ORIGIN = ['address' => 'Av. Paulista, 1578 - Bela Vista', 'latitude' => -23.561414, 'longitude' => -46.655881];

    private const FARIA_LIMA = [
        'address' => 'Avenida Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP',
        'shortAddress' => 'Pátio Victor Malzoni',
        'latitude' => -23.586447,
        'longitude' => -46.6819633,
        'city' => 'São Paulo',
        'state' => 'SP',
    ];

    private function passenger(string $phone = '11911110001'): User
    {
        $user = User::create(['name' => 'Beatriz', 'phone' => $phone, 'role' => 'passenger', 'status' => 'active']);
        Passenger::create(['user_id' => $user->id, 'emergency_pin' => '4321']);

        return $user;
    }

    /** Solicita a corrida e cancela em seguida (só pode haver uma em andamento). */
    private function rideTo(User $u, array $destination): void
    {
        $id = $this->actingAs($u, 'sanctum')->postJson('/api/v1/rides/request', [
            'origin' => self::ORIGIN,
            'destination' => $destination,
            'category' => 'pop',
            'paymentMethod' => 'pix',
        ])->assertCreated()->json('id');
        $this->actingAs($u, 'sanctum')->postJson("/api/v1/rides/{$id}/cancel", ['reason' => 'Teste'])->assertOk();
        $this->travel(1)->seconds();
    }

    private function place(string $short, float $lat, float $lng): array
    {
        return ['address' => "{$short} - Centro, São Paulo - SP", 'shortAddress' => $short, 'latitude' => $lat, 'longitude' => $lng];
    }

    public function test_requesting_a_ride_records_the_destination(): void
    {
        $u = $this->passenger();
        $this->actingAs($u, 'sanctum')->getJson('/api/v1/places/recent')->assertOk()->assertExactJson(['recent' => []]);

        $this->rideTo($u, self::FARIA_LIMA);

        $recent = $this->actingAs($u, 'sanctum')->getJson('/api/v1/places/recent')->assertOk()->json('recent');
        $this->assertCount(1, $recent);
        $this->assertIsString($recent[0]['id']);
        unset($recent[0]['id']);
        $this->assertEquals(self::FARIA_LIMA, $recent[0]);
    }

    public function test_most_recent_first_without_repeats_and_limited(): void
    {
        $u = $this->passenger();
        $this->rideTo($u, self::FARIA_LIMA);
        $this->rideTo($u, $this->place('Rua Augusta, 1500', -23.5565, -46.6586));
        // O mesmo prédio com outro nome, a ~20 m: sobe para o topo com o nome novo
        $this->rideTo($u, ['shortAddress' => 'Av. Faria Lima, 3477'] + self::FARIA_LIMA + ['latitude' => -23.5863, 'longitude' => -46.6818]);

        $recent = $this->actingAs($u, 'sanctum')->getJson('/api/v1/places/recent')->json('recent');
        $this->assertSame(['Av. Faria Lima, 3477', 'Rua Augusta, 1500'], array_column($recent, 'shortAddress'));

        foreach ([1, 2, 3, 4] as $i) {
            $this->rideTo($u, $this->place("Destino {$i}", -23.50 - $i / 100, -46.60));
        }
        $recent = $this->actingAs($u, 'sanctum')->getJson('/api/v1/places/recent')->json('recent');
        $this->assertSame(['Destino 4', 'Destino 3', 'Destino 2', 'Destino 1', 'Av. Faria Lima, 3477'], array_column($recent, 'shortAddress'));
        $this->assertSame(RecentDestination::LIMIT, RecentDestination::where('user_id', $u->id)->count(), 'Os mais antigos saem do banco.');
    }

    public function test_without_short_address_uses_the_street_part(): void
    {
        $u = $this->passenger();
        $this->rideTo($u, ['address' => 'Av. Faria Lima, 3477 - Itaim Bibi', 'latitude' => -23.585721, 'longitude' => -46.679199]);

        $this->actingAs($u, 'sanctum')->getJson('/api/v1/places/recent')
            ->assertJsonPath('recent.0.shortAddress', 'Av. Faria Lima, 3477')
            ->assertJsonMissingPath('recent.0.city');
    }

    public function test_remove_only_own_entries_and_access_rules(): void
    {
        $this->getJson('/api/v1/places/recent')->assertUnauthorized();

        $bia = $this->passenger();
        $ana = $this->passenger('11911110002');
        $this->rideTo($bia, self::FARIA_LIMA);
        $id = RecentDestination::where('user_id', $bia->id)->value('id');

        // Cada conta só vê e só remove os seus
        $this->actingAs($ana, 'sanctum')->getJson('/api/v1/places/recent')->assertExactJson(['recent' => []]);
        $this->actingAs($ana, 'sanctum')->deleteJson("/api/v1/places/recent/{$id}")->assertNoContent();
        $this->assertSame(1, RecentDestination::count());

        $this->actingAs($bia, 'sanctum')->deleteJson("/api/v1/places/recent/{$id}")->assertNoContent();
        $this->actingAs($bia, 'sanctum')->deleteJson("/api/v1/places/recent/{$id}")->assertNoContent(); // idempotente
        $this->assertSame(0, RecentDestination::count());
        $this->actingAs($bia, 'sanctum')->deleteJson('/api/v1/places/recent/nao-e-uuid')->assertNotFound();

        $driver = User::create(['name' => 'Carlos', 'phone' => '11922220001', 'role' => 'driver', 'status' => 'active']);
        $this->actingAs($driver, 'sanctum')->getJson('/api/v1/places/recent')->assertForbidden();
    }

    public function test_history_is_deleted_with_the_user(): void
    {
        $u = $this->passenger();
        $this->rideTo($u, self::FARIA_LIMA);

        $u->delete();

        $this->assertSame(0, RecentDestination::count());
    }
}
