<?php

namespace Tests\Feature;

use App\Infrastructure\Geo\PhotonGeocodingService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeoSearchTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    /** Trecho real de uma busca no Photon por "shopping morumbi" (com um repetido). */
    private const MORUMBI = [
        ['properties' => ['name' => 'Morumbi Shopping', 'street' => 'Avenida Roque Petroni Júnior', 'housenumber' => '1089', 'district' => 'Vila Cordeiro', 'city' => 'São Paulo', 'state' => 'São Paulo'], 'geometry' => ['coordinates' => [-46.6989, -23.6226]]],
        ['properties' => ['name' => 'Morumbi Shopping', 'street' => 'Avenida Roque Petroni Júnior', 'housenumber' => '1089', 'district' => 'Vila Cordeiro', 'city' => 'São Paulo', 'state' => 'São Paulo'], 'geometry' => ['coordinates' => [-46.6990, -23.6227]]],
        ['properties' => ['name' => 'Praça do Morumbi Shopping', 'district' => 'Chácara Santo Antônio', 'city' => 'São Paulo', 'state' => 'São Paulo'], 'geometry' => ['coordinates' => [-46.7000, -23.6230]]],
        ['properties' => ['street' => 'Rua Augusta', 'housenumber' => '1500', 'district' => 'Consolação', 'city' => 'São Paulo', 'state' => 'São Paulo'], 'geometry' => ['coordinates' => [-46.6580, -23.5580]]],
        ['properties' => ['city' => 'São Paulo'], 'geometry' => ['coordinates' => [-46.6, -23.5]]], // sem nome nem rua: descartado
    ];

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config(['services.photon.url' => 'https://photon.test', 'services.photon.user_agent' => 'VOZTRI/teste']);
        $this->user = User::create(['name' => 'Beatriz', 'phone' => '11911110001', 'role' => 'passenger', 'status' => 'active']);
    }

    private function search(string $q = 'shopping morumbi', float $lat = -23.561414, float $lng = -46.655881)
    {
        return $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/geo/search?' . http_build_query(['q' => $q, 'latitude' => $lat, 'longitude' => $lng]));
    }

    public function test_returns_places_with_name_as_title_and_street_address_without_duplicates(): void
    {
        Http::fake(['photon.test/*' => Http::response(['features' => self::MORUMBI])]);

        $this->search()->assertOk()->assertExactJson(['results' => [
            ['address' => 'Avenida Roque Petroni Júnior, 1089 - Vila Cordeiro, São Paulo - SP', 'shortAddress' => 'Morumbi Shopping', 'city' => 'São Paulo', 'state' => 'SP', 'latitude' => -23.6226, 'longitude' => -46.6989],
            ['address' => 'Praça do Morumbi Shopping - Chácara Santo Antônio, São Paulo - SP', 'shortAddress' => 'Praça do Morumbi Shopping', 'city' => 'São Paulo', 'state' => 'SP', 'latitude' => -23.623, 'longitude' => -46.7],
            ['address' => 'Rua Augusta, 1500 - Consolação, São Paulo - SP', 'shortAddress' => 'Rua Augusta, 1500', 'city' => 'São Paulo', 'state' => 'SP', 'latitude' => -23.558, 'longitude' => -46.658],
        ]]);
    }

    public function test_limits_search_to_region_around_rounded_position_without_unsupported_language(): void
    {
        Http::fake(['photon.test/*' => Http::response(['features' => []])]);

        $this->search('aeroporto congonhas', -23.5614139, -46.6558812)->assertOk()->assertExactJson(['results' => []]);

        Http::assertSent(function (HttpRequest $r) {
            parse_str((string) parse_url($r->url(), PHP_URL_QUERY), $q);

            return str_starts_with($r->url(), 'https://photon.test/api?')
                && $q['q'] === 'aeroporto congonhas'
                && $q['lat'] === '-23.56' && $q['lon'] === '-46.66'            // ~1 km
                && $q['bbox'] === '-47.16,-24.06,-46.16,-23.06'                // ±0,5° em volta
                && $q['limit'] === '12'
                && !isset($q['lang'])                                          // o Photon público recusa "pt" (400)
                && $r->hasHeader('User-Agent', 'VOZTRI/teste');
        });
    }

    public function test_caches_by_normalized_text_and_rounded_position(): void
    {
        Http::fake(['photon.test/*' => Http::response(['features' => self::MORUMBI])]);

        $this->search('Shopping  Morumbi', -23.5614, -46.6559)->assertOk();
        $this->search(' shopping morumbi ', -23.5640, -46.6570)->assertOk()->assertJsonCount(3, 'results');

        Http::assertSentCount(1);
    }

    public function test_provider_failure_returns_503_without_fake_results_and_is_not_cached(): void
    {
        Http::fake(['photon.test/*' => Http::sequence()
            ->push('Bad Request', 400)
            ->push(['features' => self::MORUMBI])]);

        // Antes, uma falha devolvia endereços inventados (Av. Paulista, Congonhas) para qualquer texto
        $this->search()->assertStatus(503)->assertJsonPath('error', 'GEOCODING_UNAVAILABLE')->assertJsonMissingPath('results');
        $this->search()->assertOk()->assertJsonPath('results.0.shortAddress', 'Morumbi Shopping');
    }

    public function test_validation_and_authentication(): void
    {
        $this->getJson('/api/v1/geo/search?q=morumbi&latitude=-23.5&longitude=-46.6')->assertUnauthorized();

        $this->search('ab')->assertStatus(422)->assertJsonValidationErrors(['q']);
        $this->search('   ab   ')->assertStatus(422);
        $this->actingAs($this->user, 'sanctum')->getJson('/api/v1/geo/search?q=morumbi')
            ->assertStatus(422)->assertJsonValidationErrors(['latitude', 'longitude']);
        Http::assertNothingSent();
    }

    public function test_format_place_without_street_uses_name_and_reverse_format_is_unchanged(): void
    {
        $this->assertSame(
            ['address' => 'Parque Ibirapuera - Ibirapuera, São Paulo - SP', 'shortAddress' => 'Parque Ibirapuera', 'city' => 'São Paulo', 'state' => 'SP'],
            PhotonGeocodingService::formatPlace(['name' => 'Parque Ibirapuera', 'district' => 'Ibirapuera', 'city' => 'São Paulo', 'state' => 'São Paulo']),
        );
        // No reverso, a rua continua sendo o título (e não o nome do lugar)
        $this->assertSame(
            'Av. Paulista, 1578',
            PhotonGeocodingService::format(['name' => 'Museu de Arte de São Paulo', 'street' => 'Av. Paulista', 'housenumber' => '1578'])['shortAddress'],
        );
    }
}
