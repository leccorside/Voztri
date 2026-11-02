<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Infrastructure\Geo\GeocodingUnavailable;
use App\Infrastructure\Geo\ReverseGeocoder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class GeoController extends Controller
{
    /**
     * Casas decimais da coordenada enviada ao provedor (~11 m): expõe menos a
     * posição exata a um serviço de terceiros e permite reaproveitar o cache.
     */
    public const PRECISION = 4;

    /** Endereço encontrado: um dia em cache; coordenada sem endereço: uma hora. */
    private const CACHE_HIT_SECONDS = 86400;
    private const CACHE_MISS_SECONDS = 3600;

    /**
     * Endereço de uma coordenada (embarque pelo GPS do passageiro). 404 sem
     * endereço; 503 com o provedor fora do ar (o app mantém a coordenada).
     */
    public function reverse(Request $request, ReverseGeocoder $geocoder)
    {
        $v = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $lat = round((float) $v['latitude'], self::PRECISION);
        $lng = round((float) $v['longitude'], self::PRECISION);
        $key = sprintf('geo.reverse.%.4f.%.4f', $lat, $lng);

        // "Sem endereço" fica no cache como false: o Cache::has() trata null como ausente
        $cached = Cache::get($key);
        if ($cached !== null) {
            $result = $cached === false ? null : $cached;
        } else {
            try {
                $result = $geocoder->reverse($lat, $lng);
            } catch (GeocodingUnavailable $e) {
                // Falha do provedor não entra no cache: a próxima tentativa consulta de novo
                Log::warning('Geocodificação reversa indisponível', ['erro' => $e->getMessage()]);

                return response()->json([
                    'message' => 'Não foi possível consultar o endereço agora.',
                    'error' => 'GEOCODING_UNAVAILABLE',
                ], 503);
            }
            Cache::put($key, $result ?? false, $result !== null ? self::CACHE_HIT_SECONDS : self::CACHE_MISS_SECONDS);
        }

        if ($result === null) {
            return response()->json(['message' => 'Endereço não encontrado para esta localização.', 'error' => 'ADDRESS_NOT_FOUND'], 404);
        }

        return response()->json($result);
    }
}
