<?php

namespace App\Domain\Ride\Services;

use App\Models\Driver;
use App\Models\Ride;
use App\Models\RideOffer;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Despacho de corridas por oferta, baseado no banco de dados.
 *
 * Fluxo: SEARCHING -> (oferta a um motorista) OFFERED -> aceite (ACCEPTED) ou
 * recusa/expiração (volta a SEARCHING e a corrida vai ao próximo motorista).
 * Não há worker em segundo plano: refresh() é chamado pelo polling do
 * passageiro (GET /rides/{id}) e do motorista (GET /driver/rides/current).
 */
class RideDispatcher
{
    public const OFFER_TIMEOUT_SECONDS = 15;

    /** Status em que o motorista está ocupado com uma corrida. */
    public const DRIVER_BUSY_STATUSES = ['ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'];

    public function __construct(private RideStateMachine $stateMachine) {}

    /**
     * Expira a oferta vencida (se houver) e tenta despachar a corrida de novo.
     * Seguro para chamadas concorrentes: trava a linha da corrida.
     */
    public function refresh(Ride $ride): Ride
    {
        return DB::transaction(function () use ($ride) {
            /** @var Ride $locked */
            $locked = Ride::lockForUpdate()->findOrFail($ride->id);

            if ($locked->status === 'OFFERED') {
                $offer = $this->pendingOffer($locked);
                if (!$offer || $offer->expires_at->isPast()) {
                    $offer?->update(['status' => 'expired']);
                    $this->stateMachine->transition($locked, 'SEARCHING', null, ['reason' => 'offer_expired']);
                }
            }

            if ($locked->status === 'SEARCHING') {
                $this->offerNext($locked);
            }

            return $locked;
        });
    }

    /**
     * Oferece a corrida ao motorista disponível mais próximo que ainda não a recebeu.
     * Deve ser chamado com a corrida travada (dentro de transação).
     */
    public function offerNext(Ride $ride): ?RideOffer
    {
        $alreadyOffered = RideOffer::where('ride_id', $ride->id)->pluck('driver_id');
        $busy = Ride::whereIn('status', self::DRIVER_BUSY_STATUSES)->whereNotNull('driver_id')->pluck('driver_id');
        $withPendingOffer = RideOffer::where('status', 'sent')->where('expires_at', '>', Carbon::now())->pluck('driver_id');

        $candidates = Driver::where('is_online', true)
            ->where('status', 'approved')
            ->whereNotIn('id', $alreadyOffered)
            ->whereNotIn('id', $busy)
            ->whereNotIn('id', $withPendingOffer)
            ->whereHas('activeVehicle', fn ($q) => $q->where('category', $ride->category))
            ->get();

        if ($candidates->isEmpty()) {
            return null;
        }

        [$pickupLat, $pickupLng] = $this->pickupCoordinates($ride);

        // Mais próximo primeiro; motoristas sem localização conhecida vão para o fim
        $best = $candidates->sortBy(function (Driver $d) use ($pickupLat, $pickupLng) {
            if ($d->current_latitude === null || $d->current_longitude === null || $pickupLat === null) {
                return PHP_FLOAT_MAX;
            }
            return $this->distanceKm($pickupLat, $pickupLng, $d->current_latitude, $d->current_longitude);
        })->first();

        $distance = ($pickupLat !== null && $best->current_latitude !== null)
            ? $this->distanceKm($pickupLat, $pickupLng, $best->current_latitude, $best->current_longitude)
            : 0;

        $offer = RideOffer::create([
            'ride_id' => $ride->id,
            'driver_id' => $best->id,
            'radius_km' => (int) ceil($distance),
            'status' => 'sent',
            'expires_at' => Carbon::now()->addSeconds(self::OFFER_TIMEOUT_SECONDS),
        ]);

        $this->stateMachine->transition($ride, 'OFFERED', null, ['driver_id' => $best->id, 'offer_id' => $offer->id]);

        return $offer;
    }

    /** Oferta enviada e ainda não respondida da corrida (pode estar vencida). */
    public function pendingOffer(Ride $ride): ?RideOffer
    {
        return RideOffer::where('ride_id', $ride->id)->where('status', 'sent')->latest('created_at')->first();
    }

    /** Oferta válida (não vencida) destinada ao motorista, se houver. */
    public function activeOfferFor(Driver $driver): ?RideOffer
    {
        return RideOffer::where('driver_id', $driver->id)
            ->where('status', 'sent')
            ->where('expires_at', '>', Carbon::now())
            ->latest('created_at')
            ->first();
    }

    /** @return array{0: ?float, 1: ?float} */
    private function pickupCoordinates(Ride $ride): array
    {
        $row = DB::selectOne(
            'SELECT ST_Y(pickup_location) AS lat, ST_X(pickup_location) AS lng FROM rides WHERE id = ?',
            [$ride->id]
        );

        return [$row?->lat !== null ? (float) $row->lat : null, $row?->lng !== null ? (float) $row->lng : null];
    }

    private function distanceKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return 6371 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
