<?php

namespace App\Jobs;

use App\Domain\Ride\Services\FareCalculator;
use App\Domain\Ride\Services\RideDispatcher;
use App\Infrastructure\Push\PushMessage;
use App\Infrastructure\Push\PushNotifier;
use App\Models\Ride;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\DB;

/**
 * Avisa o passageiro do andamento da corrida por push, para quando o app está
 * em segundo plano (com o app aberto, o status chega pelo polling).
 *
 * - DRIVER_EN_ROUTE: o motorista aceitou e está indo ao embarque (o aceite já
 *   coloca a corrida a caminho, então é uma notificação só, e não duas);
 * - DRIVER_ARRIVED: o motorista avisou que chegou ao embarque.
 *
 * As duas usam a mesma tag: a de chegada substitui a de "a caminho".
 */
class SendRideStatusPush implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public const EN_ROUTE = 'DRIVER_EN_ROUTE';
    public const ARRIVED = 'DRIVER_ARRIVED';

    /** Depois disso o aviso perde o sentido (a corrida já andou ou foi cancelada). */
    private const TTL_SECONDS = [self::EN_ROUTE => 900, self::ARRIVED => 600];

    public int $tries = 2;

    public function __construct(public string $rideId, public string $status) {}

    public function handle(PushNotifier $push, FareCalculator $fares): void
    {
        $ride = Ride::with(['passenger.user', 'driver.user', 'driver.activeVehicle'])->find($this->rideId);
        // A corrida mudou antes de o job rodar (cancelada, já embarcou...): não avisar
        if (!$ride || $ride->status !== $this->status || !$ride->passenger?->user || !$ride->driver) {
            return;
        }

        $driverName = self::firstName($ride->driver->user?->name);
        $vehicle = $ride->driver->activeVehicle;
        $car = $vehicle ? trim("{$vehicle->brand} {$vehicle->model} {$vehicle->color}") . " • {$vehicle->plate}" : null;

        if ($this->status === self::EN_ROUTE) {
            $eta = $this->etaMinutes($ride, $fares);
            $title = "{$driverName} está a caminho";
            $body = implode(' • ', array_filter([
                $car,
                $eta !== null ? "chega em ~{$eta} min" : 'motorista confirmado',
            ]));
        } else {
            $title = 'Seu motorista chegou';
            $body = $car
                ? "{$driverName} está no embarque: {$car}. Confira a placa antes de entrar."
                : "{$driverName} está no embarque. Confira o carro antes de entrar.";
        }

        $push->sendToUser($ride->passenger->user, new PushMessage(
            title: $title,
            body: $body,
            data: ['type' => 'ride_status', 'rideId' => $ride->id, 'status' => $this->status],
            ttlSeconds: self::TTL_SECONDS[$this->status],
            androidChannel: 'ride_updates',
            tag: "ride_{$ride->id}",
            urgent: true,
        ));
    }

    /** Tempo até o embarque pela posição atual do motorista (null se ela for velha ou desconhecida). */
    private function etaMinutes(Ride $ride, FareCalculator $fares): ?int
    {
        $driver = $ride->driver;
        $fresh = $driver->last_location_at
            && $driver->last_location_at->gt(now()->subMinutes(RideDispatcher::LOCATION_MAX_AGE_MINUTES));
        if (!$fresh || $driver->current_latitude === null || $driver->current_longitude === null) {
            return null;
        }

        $pickup = DB::selectOne('SELECT ST_Y(pickup_location) AS lat, ST_X(pickup_location) AS lng FROM rides WHERE id = ?', [$ride->id]);
        if ($pickup?->lat === null) {
            return null;
        }

        return $fares->route((float) $driver->current_latitude, (float) $driver->current_longitude, (float) $pickup->lat, (float) $pickup->lng)['minutes'];
    }

    private static function firstName(?string $name): string
    {
        $first = trim(explode(' ', trim((string) $name))[0] ?? '');

        return $first !== '' ? $first : 'Seu motorista';
    }
}
