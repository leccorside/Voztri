<?php

namespace App\Http\Presenters;

use App\Domain\Ride\Services\FareCalculator;
use App\Domain\Ride\Services\RideDispatcher;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Formato público de uma corrida para os apps mobile, igual ao tipo Ride de
 * packages/shared-types (camelCase, origin/destination com coordenadas).
 *
 * Privacidade: o PIN de embarque só vai para o passageiro dono da corrida (o
 * motorista precisa recebê-lo dele no embarque) e não há CPF, telefone nem PIN
 * de emergência dos participantes.
 */
class RidePresenter
{
    public function __construct(private FareCalculator $fares) {}

    public function present(Ride $ride, User $viewer): array
    {
        $ride->loadMissing(['passenger.user.profile', 'driver.user.profile', 'driver.activeVehicle']);

        $coords = DB::selectOne(
            'SELECT ST_Y(pickup_location) AS plat, ST_X(pickup_location) AS plng,
                    ST_Y(dropoff_location) AS dlat, ST_X(dropoff_location) AS dlng
             FROM rides WHERE id = ?',
            [$ride->id]
        );

        $isPassenger = $ride->passenger && $ride->passenger->user_id === $viewer->id;
        $isDriver = $ride->driver && $ride->driver->user_id === $viewer->id;

        return [
            'id' => $ride->id,
            'passengerId' => $ride->passenger_id,
            'passenger' => $ride->passenger ? [
                'id' => $ride->passenger->id,
                'user' => $this->userSummary($ride->passenger->user),
            ] : null,
            'driverId' => $ride->driver_id,
            'driver' => $ride->driver ? [
                'id' => $ride->driver->id,
                'user' => $this->userSummary($ride->driver->user),
                'vehicle' => $ride->driver->activeVehicle ? [
                    'brand' => $ride->driver->activeVehicle->brand,
                    'model' => $ride->driver->activeVehicle->model,
                    'color' => $ride->driver->activeVehicle->color,
                    'plate' => $ride->driver->activeVehicle->plate,
                    'category' => $ride->driver->activeVehicle->category,
                ] : null,
            ] : null,
            'status' => $ride->status,
            'category' => $ride->category,
            'categoryName' => FareCalculator::CATEGORIES[$ride->category]['categoryName'] ?? $ride->category,
            'origin' => $this->location($ride->pickup_address, $coords?->plat, $coords?->plng),
            'destination' => $this->location($ride->dropoff_address, $coords?->dlat, $coords?->dlng),
            'route' => [
                'distanceMeters' => (int) $ride->distance_meters,
                'durationSeconds' => (int) $ride->duration_seconds,
                'encodedPolyline' => $ride->route_polyline ?? '',
            ],
            'priceCents' => (int) $ride->final_price_cents,
            'formattedPrice' => FareCalculator::format((int) $ride->final_price_cents),
            'boardingPin' => $isPassenger ? $ride->boarding_pin : null,
            'driverEarningsCents' => $isDriver ? $this->fares->driverNetCents((int) $ride->final_price_cents) : null,
            'paymentMethod' => $ride->payment_method,
            'paymentStatus' => $ride->payment_status,
            'createdAt' => $ride->created_at?->toIso8601String(),
            // Prazo da busca por motorista (a API encerra a busca nele); null fora da busca
            'searchExpiresAt' => $ride->created_at && in_array($ride->status, RideDispatcher::SEARCH_STATUSES, true)
                ? RideDispatcher::searchDeadlineFor($ride)->toIso8601String()
                : null,
            'startedAt' => $ride->started_at?->toIso8601String(),
            'completedAt' => $ride->completed_at?->toIso8601String(),
            'cancelledAt' => $ride->cancelled_at?->toIso8601String(),
            'cancellationReason' => $ride->cancellation_reason,
        ];
    }

    /** Parte do endereço antes do primeiro " - " (ex.: "Av. Paulista, 1578"). */
    public static function shortAddress(string $address): string
    {
        return trim(explode(' - ', $address)[0]);
    }

    private function location(string $address, $lat, $lng): array
    {
        return [
            'address' => $address,
            'shortAddress' => self::shortAddress($address),
            'latitude' => $lat !== null ? (float) $lat : null,
            'longitude' => $lng !== null ? (float) $lng : null,
        ];
    }

    private function userSummary(?User $user): ?array
    {
        if (!$user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatarUrl' => $user->avatar_url,
            'rating' => $user->profile ? (float) $user->profile->rating_avg : null,
        ];
    }
}
