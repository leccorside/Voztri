<?php

namespace App\Jobs;

use App\Domain\Ride\Services\RideDispatcher;
use App\Models\Ride;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Timeout da busca por motorista mesmo sem polling (ex.: app do passageiro
 * minimizado). Agendado na solicitação para o vencimento do prazo
 * (RideDispatcher::SEARCH_TIMEOUT_SECONDS).
 *
 * No vencimento, refresh() expira a oferta vencida e, com a corrida de volta em
 * SEARCHING, o offerNext() a encerra como NO_DRIVER_AVAILABLE (com push). Uma
 * oferta ainda válida não é interrompida: o job volta para a fila e confere de
 * novo quando ela vencer (se o motorista aceitar, não há o que fazer).
 */
class ExpireRideSearch implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    /** Cada release() conta como tentativa: prazo antecipado + no máximo uma oferta em andamento. */
    public int $tries = 5;

    public function __construct(public string $rideId) {}

    public function handle(RideDispatcher $dispatcher): void
    {
        $ride = Ride::find($this->rideId);
        if (!$ride || !in_array($ride->status, ['SEARCHING', 'OFFERED'], true)) {
            return; // aceita, cancelada ou já encerrada
        }

        // Executado antes do prazo (fila sem atraso): volta para a fila até lá
        $remaining = Carbon::now()->diffInSeconds($dispatcher->searchDeadline($ride), false);
        if ($remaining > 0) {
            $this->release((int) ceil($remaining));
            return;
        }

        $ride = $dispatcher->refresh($ride);

        // Oferta válida em andamento: confere de novo logo depois de ela vencer
        if ($ride->status === 'OFFERED') {
            $offer = $dispatcher->pendingOffer($ride);
            $wait = $offer ? Carbon::now()->diffInSeconds($offer->expires_at, false) : 0;
            $this->release(max(1, (int) ceil($wait) + 1));
        }
    }
}
