<?php

namespace Tests\Feature;

use App\Models\SavedPlace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavedPlacesTest extends TestCase
{
    use RefreshDatabase;

    private const HOME = [
        'address' => 'Rua dos Pinheiros, 870 - Pinheiros, São Paulo - SP',
        'shortAddress' => 'Rua dos Pinheiros, 870',
        'latitude' => -23.5653,
        'longitude' => -46.6825,
        'city' => 'São Paulo',
        'state' => 'SP',
    ];

    private const WORK = [
        'address' => 'Avenida Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP',
        'shortAddress' => 'Pátio Victor Malzoni',
        'latitude' => -23.586447,
        'longitude' => -46.6819633,
    ];

    private function passenger(string $phone = '11911110001'): User
    {
        return User::create(['name' => 'Beatriz', 'phone' => $phone, 'role' => 'passenger', 'status' => 'active']);
    }

    public function test_starts_empty_then_saves_home_and_work(): void
    {
        $u = $this->passenger();

        $this->actingAs($u, 'sanctum')->getJson('/api/v1/places')->assertOk()->assertExactJson(['home' => null, 'work' => null]);

        $this->actingAs($u, 'sanctum')->putJson('/api/v1/places/home', self::HOME)
            ->assertOk()->assertExactJson(['home' => self::HOME, 'work' => null]);
        // Sem cidade e estado: os campos ficam de fora (como no AddressLocation do app)
        $this->actingAs($u, 'sanctum')->putJson('/api/v1/places/work', self::WORK)
            ->assertOk()->assertExactJson(['home' => self::HOME, 'work' => self::WORK]);

        $this->actingAs($u, 'sanctum')->getJson('/api/v1/places')->assertExactJson(['home' => self::HOME, 'work' => self::WORK]);
    }

    public function test_saving_again_replaces_and_delete_removes(): void
    {
        $u = $this->passenger();
        $this->actingAs($u, 'sanctum')->putJson('/api/v1/places/home', self::HOME)->assertOk();

        $moved = ['address' => 'Rua Augusta, 1500 - Consolação, São Paulo - SP', 'shortAddress' => 'Rua Augusta, 1500', 'latitude' => -23.5565, 'longitude' => -46.6586];
        $this->actingAs($u, 'sanctum')->putJson('/api/v1/places/home', $moved)->assertOk()->assertJsonPath('home.shortAddress', 'Rua Augusta, 1500');
        $this->assertSame(1, SavedPlace::where('user_id', $u->id)->count(), 'Um só por tipo.');

        $this->actingAs($u, 'sanctum')->deleteJson('/api/v1/places/home')->assertNoContent();
        $this->actingAs($u, 'sanctum')->deleteJson('/api/v1/places/home')->assertNoContent(); // sem erro se já não havia
        $this->assertSame(0, SavedPlace::count());
    }

    public function test_each_account_sees_only_its_own_places(): void
    {
        $bia = $this->passenger();
        $ana = $this->passenger('11911110002');
        $this->actingAs($bia, 'sanctum')->putJson('/api/v1/places/home', self::HOME)->assertOk();

        $this->actingAs($ana, 'sanctum')->getJson('/api/v1/places')->assertExactJson(['home' => null, 'work' => null]);
        // Remover o "home" da Ana não mexe no da Beatriz
        $this->actingAs($ana, 'sanctum')->deleteJson('/api/v1/places/home')->assertNoContent();
        $this->assertSame(1, SavedPlace::where('user_id', $bia->id)->count());
    }

    public function test_only_passengers_valid_kinds_and_valid_addresses(): void
    {
        $this->getJson('/api/v1/places')->assertUnauthorized();

        $driver = User::create(['name' => 'Carlos', 'phone' => '11922220001', 'role' => 'driver', 'status' => 'active']);
        $this->actingAs($driver, 'sanctum')->getJson('/api/v1/places')->assertForbidden();

        $u = $this->passenger();
        $this->actingAs($u, 'sanctum')->putJson('/api/v1/places/gym', self::HOME)->assertNotFound();
        $this->actingAs($u, 'sanctum')->putJson('/api/v1/places/home', ['address' => 'x'])
            ->assertStatus(422)->assertJsonValidationErrors(['shortAddress', 'latitude', 'longitude']);
        $this->actingAs($u, 'sanctum')->putJson('/api/v1/places/home', ['latitude' => 95] + self::HOME)
            ->assertStatus(422)->assertJsonValidationErrors(['latitude']);
    }

    public function test_places_are_deleted_with_the_user(): void
    {
        $u = $this->passenger();
        $this->actingAs($u, 'sanctum')->putJson('/api/v1/places/home', self::HOME)->assertOk();

        $u->delete();

        $this->assertSame(0, SavedPlace::count());
    }
}
