<?php

namespace App\Domain\Ride\Services;

use App\Models\Ride;
use App\Models\RideStatusHistory;
use Exception;
use Carbon\Carbon;

class RideStateMachine
{
    /**
     * Matriz de transições de status válidas
     */
    protected const ALLOWED_TRANSITIONS = [
        'REQUESTED' => ['SEARCHING', 'CANCELLED'],
        'SEARCHING' => ['OFFERED', 'ACCEPTED', 'NO_DRIVER_AVAILABLE', 'CANCELLED'],
        'OFFERED' => ['ACCEPTED', 'SEARCHING', 'CANCELLED', 'NO_DRIVER_AVAILABLE'],
        'ACCEPTED' => ['DRIVER_EN_ROUTE', 'CANCELLED'],
        'DRIVER_EN_ROUTE' => ['DRIVER_ARRIVED', 'CANCELLED'],
        'DRIVER_ARRIVED' => ['IN_PROGRESS', 'CANCELLED'],
        'IN_PROGRESS' => ['COMPLETED', 'CANCELLED'],
        'COMPLETED' => [],
        'CANCELLED' => [],
        'NO_DRIVER_AVAILABLE' => ['SEARCHING'],
    ];

    /**
     * Executa a transição de estado da corrida garantindo regras e auditoria
     */
    public function transition(Ride $ride, string $targetStatus, ?string $userId = null, array $metadata = []): Ride
    {
        $currentStatus = $ride->status;

        if (!isset(self::ALLOWED_TRANSITIONS[$currentStatus]) || !in_array($targetStatus, self::ALLOWED_TRANSITIONS[$currentStatus])) {
            throw new Exception("Transição de status inválida de {$currentStatus} para {$targetStatus}");
        }

        $ride->status = $targetStatus;

        if ($targetStatus === 'IN_PROGRESS' && !$ride->started_at) {
            $ride->started_at = Carbon::now();
        } elseif ($targetStatus === 'COMPLETED' && !$ride->completed_at) {
            $ride->completed_at = Carbon::now();
        } elseif ($targetStatus === 'CANCELLED' && !$ride->cancelled_at) {
            $ride->cancelled_at = Carbon::now();
            $ride->cancelled_by = $userId;
        }

        $ride->save();

        // Grava histórico de status para auditoria imutável
        RideStatusHistory::create([
            'ride_id' => $ride->id,
            'from_status' => $currentStatus,
            'to_status' => $targetStatus,
            'triggered_by' => $userId,
            'metadata' => $metadata,
            'created_at' => Carbon::now(),
        ]);

        return $ride;
    }
}
