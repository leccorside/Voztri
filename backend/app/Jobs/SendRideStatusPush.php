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
 * - DRIVER_ARRIVED: o motorista chegou ao embarque;
 * - CANCELLED: só quando quem cancelou foi o motorista (o passageiro que cancela já sabe);
 * - COMPLETED: viagem concluída, com o total e o convite para avaliar.
 *
 * Todas usam a mesma tag por corrida: cada aviso substitui o anterior.
 */
class SendRideStatusPush implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public const EN_ROUTE = 'DRIVER_EN_ROUTE';
    public const ARRIVED = 'DRIVER_ARRIVED';
    public const CANCELLED = 'CANCELLED';
    public const COMPLETED = 'COMPLETED';

    /** Depois disso o aviso perde o sentido (a corrida já andou ou foi cancelada). */
    private const TTL_SECONDS = [
        self::EN_ROUTE => 900,
        self::ARRIVED => 600,
        self::CANCELLED => 1800,
        self::COMPLETED => 86400, // o convite para avaliar vale até o dia seguinte
    ];

    /** Já com a preposição: "Total: R$ 30,52 em dinheiro". */
    private const PAYMENT_LABEL = [
        'pix' => 'no Pix',
        'credit_card' => 'no cartão',
        'cash' => 'em dinheiro',
        'wallet' => 'com o saldo da carteira',
    ];

    public int $tries = 2;

    public function __construct(public string $rideId, public string $status) {}

    public function handle(PushNotifier $push, FareCalculator $fares): void
    {
        $ride = Ride::with(['passenger.user', 'driver.user', 'driver.activeVehicle'])->find($this->rideId);
        // A corrida mudou antes de o job rodar (cancelada, já embarcou...): não avisar
        if (!$ride || $ride->status !== $this->status || !$ride->passenger?->user || !$ride->driver) {
            return;
        }
        // Cancelada pelo próprio passageiro (ou pelo sistema): não há o que avisar
        if ($this->status === self::CANCELLED && $ride->cancelled_by !== $ride->driver->user_id) {
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
        } elseif ($this->status === self::ARRIVED) {
            $title = 'Seu motorista chegou';
            $body = $car
                ? "{$driverName} está no embarque: {$car}. Confira a placa antes de entrar."
                : "{$driverName} está no embarque. Confira o carro antes de entrar.";
        } elseif ($this->status === self::CANCELLED) {
            // O motivo digitado pelo motorista não vai na notificação (texto livre na tela bloqueada)
            $title = 'Corrida cancelada pelo motorista';
            $body = "{$driverName} cancelou a corrida. Toque para pedir outro motorista.";
        } else {
            $total = FareCalculator::format((int) $ride->final_price_cents);
            $payment = self::PAYMENT_LABEL[$ride->payment_method] ?? $ride->payment_method;
            $title = 'Viagem concluída';
            $body = trim("Total: {$total} {$payment}") . ". Toque para avaliar {$driverName}.";
        }

        $push->sendToUser($ride->passenger->user, new PushMessage(
            title: $title,
            body: $body,
            data: ['type' => 'ride_status', 'rideId' => $ride->id, 'status' => $this->status],
            ttlSeconds: self::TTL_SECONDS[$this->status],
            androidChannel: 'ride_updates',
            tag: "ride_{$ride->id}",
            // A conclusão não precisa acordar o aparelho; os outros avisos exigem ação
            urgent: $this->status !== self::COMPLETED,
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
