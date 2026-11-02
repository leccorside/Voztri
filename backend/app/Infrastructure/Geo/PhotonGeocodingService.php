<?php

namespace App\Infrastructure\Geo;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Geocodificação pelo Photon (OpenStreetMap). A URL vem de services.photon.url
 * (PHOTON_GEOCODING_URL): a instância pública photon.komoot.io em desenvolvimento
 * (uso justo, sem SLA) ou um Photon próprio, trocando só a URL.
 */
class PhotonGeocodingService implements ReverseGeocoder, AddressSearch
{
    /** Siglas dos estados (o Photon devolve o nome por extenso). */
    private const UF = [
        'Acre' => 'AC', 'Alagoas' => 'AL', 'Amapá' => 'AP', 'Amazonas' => 'AM', 'Bahia' => 'BA',
        'Ceará' => 'CE', 'Distrito Federal' => 'DF', 'Espírito Santo' => 'ES', 'Goiás' => 'GO',
        'Maranhão' => 'MA', 'Mato Grosso' => 'MT', 'Mato Grosso do Sul' => 'MS', 'Minas Gerais' => 'MG',
        'Pará' => 'PA', 'Paraíba' => 'PB', 'Paraná' => 'PR', 'Pernambuco' => 'PE', 'Piauí' => 'PI',
        'Rio de Janeiro' => 'RJ', 'Rio Grande do Norte' => 'RN', 'Rio Grande do Sul' => 'RS',
        'Rondônia' => 'RO', 'Roraima' => 'RR', 'Santa Catarina' => 'SC', 'São Paulo' => 'SP',
        'Sergipe' => 'SE', 'Tocantins' => 'TO',
    ];

    /**
     * A busca fica restrita a um quadrado de ±SEARCH_RADIUS_DEGREES (~55 km) em volta do
     * passageiro: sem isso, "congonhas" devolve cidades de Minas Gerais em vez do aeroporto.
     */
    public const SEARCH_RADIUS_DEGREES = 0.5;

    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.photon.url'), '/');
    }

    /**
     * Endereço da coordenada: "Rua, número - Bairro, Cidade - UF" e a parte curta
     * ("Rua, número"), no mesmo formato dos endereços do resto do app.
     */
    public function reverse(float $latitude, float $longitude): ?array
    {
        $props = $this->get('reverse', ['lat' => $latitude, 'lon' => $longitude, 'limit' => 1])->json('features.0.properties');

        return is_array($props) ? self::format($props) : null;
    }

    /**
     * Destinos pelo texto, perto do passageiro: o nome do lugar como título quando há
     * ("Morumbi Shopping"), o endereço completo e a coordenada. Sem repetidos.
     */
    public function search(string $query, float $nearLatitude, float $nearLongitude, int $limit = 6): array
    {
        $r = self::SEARCH_RADIUS_DEGREES;
        $features = $this->get('api', [
            'q' => $query,
            'lat' => $nearLatitude,
            'lon' => $nearLongitude,
            // Pede a mais: parte dos resultados repete o mesmo lugar (um por entrada no mapa)
            'limit' => $limit * 2,
            'bbox' => implode(',', [$nearLongitude - $r, $nearLatitude - $r, $nearLongitude + $r, $nearLatitude + $r]),
        ])->json('features') ?? [];

        $results = [];
        foreach ($features as $f) {
            $coords = $f['geometry']['coordinates'] ?? null;
            $place = is_array($f['properties'] ?? null) ? self::formatPlace($f['properties']) : null;
            if ($place === null || !is_array($coords) || count($coords) < 2) {
                continue;
            }
            $key = mb_strtolower("{$place['shortAddress']}|{$place['address']}");
            if (isset($results[$key])) {
                continue;
            }
            $results[$key] = $place + ['latitude' => (float) $coords[1], 'longitude' => (float) $coords[0]];
            if (count($results) >= $limit) {
                break;
            }
        }

        return array_values($results);
    }

    /** GET no Photon; rede fora ou erro HTTP viram GeocodingUnavailable. */
    private function get(string $path, array $query): Response
    {
        try {
            $response = Http::timeout(4)
                ->withHeaders(['User-Agent' => (string) config('services.photon.user_agent')])
                ->get("{$this->baseUrl}/{$path}", $query);
        } catch (ConnectionException $e) {
            throw new GeocodingUnavailable('Photon sem resposta: ' . $e->getMessage(), 0, $e);
        }

        if (!$response->successful()) {
            throw new GeocodingUnavailable("Photon respondeu {$response->status()}");
        }

        return $response;
    }

    /**
     * Endereço de rua (geocodificação reversa): a rua com número é o título.
     *
     * @param array<string, mixed> $p propriedades de uma feature do Photon
     * @return array{address: string, shortAddress: string, city: ?string, state: ?string}|null
     */
    public static function format(array $p): ?array
    {
        $street = self::streetLine($p);
        $name = self::text($p['name'] ?? null);

        // Rua (com número) quando há; senão o nome do lugar (praça, parque, rodovia...)
        $short = $street ?? $name;
        if ($short === null) {
            return null;
        }

        return self::compose($short, $short, $p);
    }

    /**
     * Lugar de uma busca: o nome como título quando há ("Morumbi Shopping"), com o
     * endereço da rua ("Avenida Roque Petroni Júnior, 1089 - Vila Cordeiro, São Paulo - SP").
     *
     * @param array<string, mixed> $p propriedades de uma feature do Photon
     * @return array{address: string, shortAddress: string, city: ?string, state: ?string}|null
     */
    public static function formatPlace(array $p): ?array
    {
        $street = self::streetLine($p);
        $name = self::text($p['name'] ?? null);
        $title = $name ?? $street;
        if ($title === null) {
            return null;
        }

        // Sem rua, o endereço começa pelo próprio nome (ex.: um parque só com bairro)
        return self::compose($title, $street ?? $title, $p);
    }

    /** "Rua, número" ou "Rua"; null sem rua. */
    private static function streetLine(array $p): ?string
    {
        $street = self::text($p['street'] ?? null);
        $number = self::text($p['housenumber'] ?? null);

        return $street !== null ? ($number !== null ? "{$street}, {$number}" : $street) : null;
    }

    /**
     * @return array{address: string, shortAddress: string, city: ?string, state: ?string}
     */
    private static function compose(string $short, string $first, array $p): array
    {
        $district = self::text($p['district'] ?? null) ?? self::text($p['locality'] ?? null);
        $city = self::text($p['city'] ?? null) ?? self::text($p['county'] ?? null);
        $stateName = self::text($p['state'] ?? null);
        $state = $stateName !== null ? (self::UF[$stateName] ?? $stateName) : null;

        $address = $first;
        $hasDistrict = $district !== null && $district !== $first;
        if ($hasDistrict) {
            $address .= " - {$district}";
        }
        $place = implode(' - ', array_filter([$city, $state], fn ($v) => $v !== null));
        if ($place !== '') {
            $address .= ($hasDistrict ? ', ' : ' - ') . $place;
        }

        return ['address' => $address, 'shortAddress' => $short, 'city' => $city, 'state' => $state];
    }

    private static function text(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : '';

        return $value !== '' ? $value : null;
    }
}
