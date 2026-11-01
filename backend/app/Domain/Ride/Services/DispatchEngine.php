<?php

namespace App\Domain\Ride\Services;

use App\Models\Ride;
use App\Models\RideOffer;
use App\Models\Driver;
use App\Infrastructure\Geo\DriverGeoRepository;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Exception;

class DispatchEngine
{
    protected array $radiusesKm = [2, 5, 8, 12];
    protected int $offerTimeoutSeconds = 15;

    public function __construct(
        protected DriverGeoRepository $geoRepo,
        protected RideStateMachine $stateMachine
    ) {}

    /**
     * Executa o ciclo de despacho de uma corrida buscando motoristas qualificados
     */
    public function dispatchRide(Ride $ride, float $pickupLat, float $pickupLng): ?RideOffer
    {
        // Trava de concorrência distribuída no Redis
        $lockKey = "lock:dispatch:ride:{$ride->id}";
        $acquired = Redis::set($lockKey, 'locked', 'EX', 30, 'NX');

        if (!$acquired) {
            return null;
        }

        try {
            foreach ($this->radiusesKm as $radius) {
                $candidates = $this->geoRepo->findNearbyAvailableDrivers(
                    $pickupLat,
                    $pickupLng,
                    $ride->category,
                    $radius
                );

                if (!empty($candidates)) {
                    // Ordena por menor distância/tempo estimado e maior nota
                    usort($candidates, function ($a, $b) {
                        return ($b->user->profile->rating_avg ?? 5.0) <=> ($a->user->profile->rating_avg ?? 5.0);
                    });

                    $bestDriver = $candidates[0];

                    // Cria oferta atômica com tempo de expiração
                    $offer = RideOffer::create([
                        'ride_id' => $ride->id,
                        'driver_id' => $bestDriver->id,
                        'radius_km' => $radius,
                        'status' => 'sent',
                        'expires_at' => Carbon::now()->addSeconds($this->offerTimeoutSeconds),
                    ]);

                    $this->stateMachine->transition($ride, 'OFFERED', null, ['driver_id' => $bestDriver->id]);
                    return $offer;
                }
            }

            // Se nenhum motorista foi encontrado em até 12 km
            $this->stateMachine->transition($ride, 'NO_DRIVER_AVAILABLE');
            return null;
        } finally {
            Redis::del($lockKey);
        }
    }
}
