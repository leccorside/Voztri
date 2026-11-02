<?php

namespace App\Jobs;

use App\Models\RecentDestination;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Prazo de retenção do histórico de destinos (LGPD: dado de localização não fica
 * guardado sem necessidade). Apaga os destinos sem uso há mais de
 * RecentDestination::RETENTION_DAYS dias. Agendado uma vez por dia em
 * routes/console.php; o GET do histórico já esconde os vencidos entre uma
 * execução e outra.
 */
class PruneRecentDestinations implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable;

    /**
     * Prazo máximo da trava de unicidade (s): ela é pega no disparo e solta quando
     * o job termina (ou falha de vez); se o worker morrer segurando-a, expira sozinha.
     */
    public int $uniqueFor = 3600;

    /**
     * Trava de unicidade no Redis, compartilhado pelos servidores e workers,
     * independente do CACHE_STORE do ambiente. Enquanto um job está na fila ou
     * rodando, um segundo disparo (agendado ou manual) é descartado.
     */
    public function uniqueVia(): Repository
    {
        return Cache::store('redis');
    }

    public function handle(): void
    {
        $deleted = RecentDestination::expired()->delete();

        if ($deleted > 0) {
            Log::info('Histórico de destinos: entradas vencidas apagadas.', [
                'deleted' => $deleted,
                'retention_days' => RecentDestination::RETENTION_DAYS,
            ]);
        }
    }
}
