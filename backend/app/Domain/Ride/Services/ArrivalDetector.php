<?php

namespace App\Domain\Ride\Services;

use App\Jobs\SendRideStatusPush;
use App\Models\Driver;
use App\Models\Ride;
use Illuminate\Support\Facades\DB;

/**
 * Chegada do motorista ao embarque (DRIVER_EN_ROUTE -> DRIVER_ARRIVED).
 *
 * - Automática: cada posição enviada a /driver/location (pelo app ou pelo
 *   serviço nativo em segundo plano) é comparada com o embarque. A chegada só
 *   é marcada quando o círculo de incerteza do GPS inteiro cabe no raio:
 *   distância + precisão (accuracy) <= AUTO_RADIUS_METERS. Sem a precisão não
 *   há como garantir isso, e a chegada automática não acontece.
 * - Manual ("Cheguei ao embarque"): aceita a até MANUAL_MAX_METERS, margem
 *   maior para o erro do GPS e para quem parou do outro lado da rua.
 */
class ArrivalDetector
{
    public const AUTO_RADIUS_METERS = 100;
    public const MANUAL_MAX_METERS = 300;
    /** Posição guardada aceita para o aviso manual quando o app não manda a atual. */
    public const POSITION_MAX_AGE_SECONDS = 120;

    public function __construct(private RideStateMachine $stateMachine) {}

    /** Distância em metros (geodésica, PostGIS) do ponto ao embarque da corrida. */
    public function distanceToPickup(Ride $ride, float $latitude, float $longitude): ?float
    {
        $row = DB::selectOne(
            'SELECT ST_Distance(pickup_location::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) AS meters
             FROM rides WHERE id = ? AND pickup_location IS NOT NULL',
            [$longitude, $latitude, $ride->id]
        );

        return $row?->meters !== null ? (float) $row->meters : null;
    }

    /**
     * Nova posição do motorista: marca a chegada se ele estiver indo a um
     * embarque e já estiver perto, considerando a precisão do GPS (raio de
     * incerteza em metros). Devolve a corrida quando marcou.
     */
    public function onDriverLocation(Driver $driver, float $latitude, float $longitude, ?float $accuracy): ?Ride
    {
        // Precisão desconhecida, ou maior que o próprio raio: nunca caberia
        if ($accuracy === null || $accuracy > self::AUTO_RADIUS_METERS) {
            return null;
        }

        $ride = Ride::where('driver_id', $driver->id)->where('status', 'DRIVER_EN_ROUTE')->first();
        if (!$ride) {
            return null;
        }

        $meters = $this->distanceToPickup($ride, $latitude, $longitude);
        if ($meters === null || $meters + $accuracy > self::AUTO_RADIUS_METERS) {
            return null;
        }

        return DB::transaction(function () use ($ride, $driver, $meters, $accuracy) {
            $locked = Ride::lockForUpdate()->find($ride->id);
            // Outro envio (ou o botão) já marcou, ou a corrida mudou nesse meio-tempo
            if (!$locked || $locked->status !== 'DRIVER_EN_ROUTE' || $locked->driver_id !== $driver->id) {
                return null;
            }

            return $this->markArrived($locked, $driver->user_id, 'auto', $meters, $accuracy);
        });
    }

    /**
     * Marca a chegada numa corrida já travada (lockForUpdate) em DRIVER_EN_ROUTE
     * e agenda o push ao passageiro para depois do commit.
     */
    public function markArrived(Ride $ride, ?string $userId, string $source, ?float $meters, ?float $accuracy = null): Ride
    {
        $this->stateMachine->transition($ride, 'DRIVER_ARRIVED', $userId, array_filter([
            'source' => $source,
            'distance_m' => $meters !== null ? (int) round($meters) : null,
            'accuracy_m' => $accuracy !== null ? (int) round($accuracy) : null,
        ], fn ($v) => $v !== null));

        SendRideStatusPush::dispatch($ride->id, SendRideStatusPush::ARRIVED)->afterCommit();

        return $ride;
    }
}
