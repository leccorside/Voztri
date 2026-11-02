<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Infrastructure\Geo\AddressSearch;
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

    /** Casas decimais da posição de referência da busca (~1,1 km). */
    public const SEARCH_NEAR_PRECISION = 2;

    /** Uma busca fica uma hora em cache (texto normalizado + posição arredondada). */
    private const SEARCH_CACHE_SECONDS = 3600;

    /**
     * Destinos pelo texto, perto do passageiro (Photon). A posição de referência vai
     * arredondada a ~1 km: só serve para priorizar e limitar a região da busca.
     * 503 com o provedor fora do ar; lista vazia quando nada foi encontrado.
     */
    public function search(Request $request, AddressSearch $places)
    {
        $v = $request->validate([
            'q' => 'required|string|min:3|max:120',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $query = preg_replace('/\s+/u', ' ', trim($v['q']));
        if (mb_strlen($query) < 3) {
            return response()->json(['message' => 'Digite pelo menos 3 letras.', 'errors' => ['q' => ['Digite pelo menos 3 letras.']]], 422);
        }
        $lat = round((float) $v['latitude'], self::SEARCH_NEAR_PRECISION);
        $lng = round((float) $v['longitude'], self::SEARCH_NEAR_PRECISION);
        $key = sprintf('geo.search.%s.%.2f.%.2f', md5(mb_strtolower($query)), $lat, $lng);

        $results = Cache::get($key);
        if ($results === null) {
            try {
                $results = $places->search($query, $lat, $lng);
            } catch (GeocodingUnavailable $e) {
                Log::warning('Busca de endereços indisponível', ['erro' => $e->getMessage()]);

                return response()->json([
                    'message' => 'Não foi possível buscar endereços agora.',
                    'error' => 'GEOCODING_UNAVAILABLE',
                ], 503);
            }
            Cache::put($key, $results, self::SEARCH_CACHE_SECONDS);
        }

        return response()->json(['results' => $results]);
    }
}
