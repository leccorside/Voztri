<?php

namespace App\Infrastructure\Geo;

use App\Models\Driver;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DriverGeoRepository
{
    /**
     * Busca motoristas disponíveis e online dentro de um raio (km)
     */
    public function findNearbyAvailableDrivers(float $latitude, float $longitude, string $category = 'pop', int $radiusKm = 5): array
    {
        $candidateDriverIds = [];

        // 1. Tenta consulta via Redis In-Memory Geo index
        try {
            $redisDrivers = Redis::georadius('driver_geo', $longitude, $latitude, $radiusKm, 'km', ['WITHDIST', 'ASC']);
            if (!empty($redisDrivers)) {
                foreach ($redisDrivers as $item) {
                    $candidateDriverIds[] = $item[0];
                }
            }
        } catch (\Exception $e) {
            // Continua via PostGIS
        }

        // 2. Consulta PostGIS com filtro de categoria e status ativo
        $query = Driver::with(['user', 'activeVehicle'])
            ->where('is_online', true)
            ->where('status', 'approved')
            ->whereHas('activeVehicle', function ($q) use ($category) {
                if ($category !== 'all') {
                    $q->where('category', $category)->where('is_active', true);
                }
            });

        if (!empty($candidateDriverIds)) {
            $query->whereIn('id', $candidateDriverIds);
        } else {
            // Consulta de distância geográfica geodésica em metros
            $query->whereRaw(
                "ST_DWithin(
                    ST_SetSRID(ST_MakePoint(current_longitude, current_latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                    ?
                )",
                [$longitude, $latitude, $radiusKm * 1000]
            );
        }

        return $query->get()->all();
    }
}

