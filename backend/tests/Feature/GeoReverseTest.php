<?php

namespace Tests\Feature;

use App\Infrastructure\Geo\PhotonGeocodingService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeoReverseTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    /** Resposta real do Photon para a Av. Paulista, 1578 (MASP). */
    private const MASP = [
        'osm_key' => 'tourism', 'type' => 'house', 'housenumber' => '1578', 'name' => 'Museu de Arte de São Paulo',
        'street' => 'Av. Paulista', 'locality' => 'Morro dos Ingleses', 'district' => 'Bela Vista',
        'city' => 'São Paulo', 'state' => 'São Paulo', 'country' => 'Brasil', 'postcode' => '01310-200',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config(['services.photon.url' => 'https://photon.test/', 'services.photon.user_agent' => 'VOZTRI/teste']);
        $this->user = User::create(['name' => 'Beatriz', 'phone' => '11911110001', 'role' => 'passenger', 'status' => 'active']);
    }

    private function photon(array $properties = self::MASP, int $status = 200): void
    {
        Http::fake(['photon.test/*' => Http::response(
            $properties ? ['features' => [['properties' => $properties]]] : ['features' => []],
            $status,
        )]);
    }

    private function reverse(float $lat = -23.561414, float $lng = -46.655881)
    {
        return $this->actingAs($this->user, 'sanctum')->getJson("/api/v1/geo/reverse?latitude={$lat}&longitude={$lng}");
    }

    public function test_returns_address_in_app_format_with_state_abbreviation(): void
    {
        $this->photon();

        $this->reverse()->assertOk()->assertExactJson([
            'address' => 'Av. Paulista, 1578 - Bela Vista, São Paulo - SP',
            'shortAddress' => 'Av. Paulista, 1578',
            'city' => 'São Paulo',
            'state' => 'SP',
        ]);
    }

    public function test_sends_rounded_coordinates_and_user_agent_to_provider(): void
    {
        $this->photon();

        $this->reverse(-23.5614139, -46.6558812)->assertOk();

        Http::assertSent(function (HttpRequest $r) {
            parse_str((string) parse_url($r->url(), PHP_URL_QUERY), $q);

            return str_starts_with($r->url(), 'https://photon.test/reverse?')
                && $q['lat'] === '-23.5614' && $q['lon'] === '-46.6559' && $q['limit'] === '1'
                && $r->hasHeader('User-Agent', 'VOZTRI/teste');
        });
    }

    public function test_caches_by_rounded_coordinate(): void
    {
        $this->photon();

        $this->reverse(-23.561414, -46.655881)->assertOk();
        // ~4 m de diferença: mesma coordenada arredondada, sem nova consulta
        $this->reverse(-23.561440, -46.655870)->assertOk()->assertJsonPath('shortAddress', 'Av. Paulista, 1578');

        Http::assertSentCount(1);
    }

    public function test_no_address_returns_404_and_is_cached(): void
    {
        $this->photon([]);

        $this->reverse(-23.0, -45.0)->assertNotFound()->assertJsonPath('error', 'ADDRESS_NOT_FOUND');
        $this->reverse(-23.0, -45.0)->assertNotFound();
        Http::assertSentCount(1);
    }

    public function test_provider_failure_returns_503_and_is_not_cached(): void
    {
        Http::fake(['photon.test/*' => Http::sequence()
            ->push(['message' => 'erro'], 502)
            ->push(['features' => [['properties' => self::MASP]]], 200)]);

        $this->reverse()->assertStatus(503)->assertJsonPath('error', 'GEOCODING_UNAVAILABLE');
        // A falha não ficou no cache: a próxima tentativa consulta de novo e acerta
        $this->reverse()->assertOk()->assertJsonPath('shortAddress', 'Av. Paulista, 1578');
    }

    public function test_provider_timeout_returns_503(): void
    {
        Http::fake(fn () => throw new \Illuminate\Http\Client\ConnectionException('Connection timed out'));

        $this->reverse()->assertStatus(503)->assertJsonPath('error', 'GEOCODING_UNAVAILABLE');
    }

    public function test_requires_authentication_and_valid_coordinates(): void
    {
        $this->getJson('/api/v1/geo/reverse?latitude=-23.5&longitude=-46.6')->assertUnauthorized();

        $this->actingAs($this->user, 'sanctum')->getJson('/api/v1/geo/reverse?latitude=95&longitude=-46.6')
            ->assertStatus(422)->assertJsonValidationErrors(['latitude']);
        $this->actingAs($this->user, 'sanctum')->getJson('/api/v1/geo/reverse?latitude=-23.5')
            ->assertStatus(422)->assertJsonValidationErrors(['longitude']);
    }

    public function test_format_variations(): void
    {
        // Sem número, sem bairro
        $this->assertSame(
            ['address' => 'Rua Augusta - São Paulo - SP', 'shortAddress' => 'Rua Augusta', 'city' => 'São Paulo', 'state' => 'SP'],
            PhotonGeocodingService::format(['street' => 'Rua Augusta', 'city' => 'São Paulo', 'state' => 'São Paulo']),
        );
        // Sem rua: nome do lugar; bairro pela "locality"; estado desconhecido fica por extenso
        $this->assertSame(
            ['address' => 'Parque Ibirapuera - Vila Mariana, São Paulo - Província X', 'shortAddress' => 'Parque Ibirapuera', 'city' => 'São Paulo', 'state' => 'Província X'],
            PhotonGeocodingService::format(['name' => 'Parque Ibirapuera', 'locality' => 'Vila Mariana', 'city' => 'São Paulo', 'state' => 'Província X']),
        );
        // Cidade pelo "county" e sem nada para mostrar
        $this->assertSame(
            'Rodovia SP-055 - Bertioga - SP',
            PhotonGeocodingService::format(['street' => 'Rodovia SP-055', 'county' => 'Bertioga', 'state' => 'São Paulo'])['address'],
        );
        $this->assertNull(PhotonGeocodingService::format(['city' => 'São Paulo', 'state' => 'São Paulo']));
    }
}
