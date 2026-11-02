<?php

namespace App\Jobs;

use App\Domain\Ride\Services\FareCalculator;
use App\Http\Presenters\RidePresenter;
use App\Infrastructure\Push\PushMessage;
use App\Infrastructure\Push\PushNotifier;
use App\Models\Driver;
use App\Models\Ride;
use App\Models\RideOffer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Avisa o motorista de uma nova oferta por push, para quando o app está em
 * segundo plano (com o app aberto, a oferta chega pelo polling).
 */
class SendRideOfferPush implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    /** A oferta dura segundos: tentar de novo depois não ajuda. */
    public int $tries = 1;

    public function __construct(public string $offerId) {}

    public function handle(PushNotifier $push, FareCalculator $fares): void
    {
        $offer = RideOffer::find($this->offerId);
        // Respondida ou vencida antes de o job rodar: não avisar
        if (!$offer || $offer->status !== 'sent' || $offer->expires_at->isPast()) {
            return;
        }

        $driver = Driver::with('user')->find($offer->driver_id);
        $ride = Ride::find($offer->ride_id);
        if (!$driver?->user || !$ride) {
            return;
        }

        $secondsLeft = max(1, (int) floor(now()->diffInSeconds($offer->expires_at, false)));
        $earnings = FareCalculator::format($fares->driverNetCents((int) $ride->final_price_cents));
        $km = number_format($ride->distance_meters / 1000, 1, ',', '.');

        $push->sendToUser($driver->user, new PushMessage(
            title: "Nova corrida: {$earnings}",
            body: 'Embarque: ' . RidePresenter::shortAddress($ride->pickup_address) . " • {$km} km • responda em {$secondsLeft} s",
            data: [
                'type' => 'ride_offer',
                'rideId' => $ride->id,
                'expiresAt' => $offer->expires_at->toIso8601String(),
            ],
            ttlSeconds: $secondsLeft,
            androidChannel: 'ride_offers',
            tag: 'ride_offer',
            urgent: true,
        ));
    }
}
