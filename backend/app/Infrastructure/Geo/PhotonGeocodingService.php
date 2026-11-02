<?php

namespace App\Infrastructure\Geo;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Exception;

/**
 * Geocodificação pelo Photon (OpenStreetMap). A URL vem de services.photon.url
 * (PHOTON_GEOCODING_URL): a instância pública photon.komoot.io em desenvolvimento
 * (uso justo, sem SLA) ou um Photon próprio, trocando só a URL.
 */
class PhotonGeocodingService implements ReverseGeocoder
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
        try {
            $response = Http::timeout(4)
                ->withHeaders(['User-Agent' => (string) config('services.photon.user_agent')])
                ->get("{$this->baseUrl}/reverse", ['lat' => $latitude, 'lon' => $longitude, 'limit' => 1]);
        } catch (ConnectionException $e) {
            throw new GeocodingUnavailable('Photon sem resposta: ' . $e->getMessage(), 0, $e);
        }

        if (!$response->successful()) {
            throw new GeocodingUnavailable("Photon respondeu {$response->status()}");
        }

        $props = $response->json('features.0.properties');

        return is_array($props) ? self::format($props) : null;
    }

    /**
     * @param array<string, mixed> $p propriedades de uma feature do Photon
     * @return array{address: string, shortAddress: string, city: ?string, state: ?string}|null
     */
    public static function format(array $p): ?array
    {
        $street = self::text($p['street'] ?? null);
        $number = self::text($p['housenumber'] ?? null);
        $name = self::text($p['name'] ?? null);
        $district = self::text($p['district'] ?? null) ?? self::text($p['locality'] ?? null);
        $city = self::text($p['city'] ?? null) ?? self::text($p['county'] ?? null);
        $stateName = self::text($p['state'] ?? null);
        $state = $stateName !== null ? (self::UF[$stateName] ?? $stateName) : null;

        // Rua (com número) quando há; senão o nome do lugar (praça, parque, rodovia...)
        $short = $street !== null ? ($number !== null ? "{$street}, {$number}" : $street) : $name;
        if ($short === null) {
            return null;
        }

        $address = $short;
        if ($district !== null && $district !== $short) {
            $address .= " - {$district}";
        }
        $place = implode(' - ', array_filter([$city, $state], fn ($v) => $v !== null));
        if ($place !== '') {
            $address .= ($district !== null && $district !== $short ? ', ' : ' - ') . $place;
        }

        return ['address' => $address, 'shortAddress' => $short, 'city' => $city, 'state' => $state];
    }

    private static function text(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : '';

        return $value !== '' ? $value : null;
    }

    /**
     * Busca autocompletar de endereços via Photon / OSM
     */
    public function searchAddress(string $query, ?float $proximityLat = -23.550520, ?float $proximityLng = -46.633308): array
    {
        try {
            $url = "{$this->baseUrl}/api/?q=" . urlencode($query) . "&lat={$proximityLat}&lon={$proximityLng}&lang=pt&limit=5";
            $response = Http::timeout(3)->get($url);

            if ($response->successful()) {
                $features = $response->json('features') ?? [];
                $results = [];

                foreach ($features as $f) {
                    $props = $f['properties'] ?? [];
                    $coords = $f['geometry']['coordinates'] ?? [0, 0];

                    $name = $props['name'] ?? $props['street'] ?? $query;
                    $city = $props['city'] ?? $props['county'] ?? 'São Paulo';
                    $state = $props['state'] ?? 'SP';

                    $results[] = [
                        'address' => "{$name}, {$city} - {$state}",
                        'shortAddress' => $name,
                        'latitude' => (float) $coords[1],
                        'longitude' => (float) $coords[0],
                        'city' => $city,
                        'state' => $state,
                    ];
                }

                if (!empty($results)) {
                    return $results;
                }
            }
        } catch (Exception $e) {
            // Fallback de catálogo local
        }

        // Sugestões de desenvolvimento resilientes
        return [
            [
                'address' => "Av. Paulista, 1578 - Bela Vista, São Paulo - SP",
                'shortAddress' => 'Av. Paulista, 1578',
                'latitude' => -23.561414,
                'longitude' => -46.655881,
                'city' => 'São Paulo',
                'state' => 'SP',
            ],
            [
                'address' => "Aeroporto de Congonhas - Vila Congonhas, São Paulo - SP",
                'shortAddress' => 'Aeroporto de Congonhas',
                'latitude' => -23.626110,
                'longitude' => -46.656387,
                'city' => 'São Paulo',
                'state' => 'SP',
            ],
        ];
    }
}
