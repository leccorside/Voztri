<?php

namespace App\Jobs;

use App\Models\RecentDestination;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

/**
 * Prazo de retenção do histórico de destinos (LGPD: dado de localização não fica
 * guardado sem necessidade). Apaga os destinos sem uso há mais de
 * RecentDestination::RETENTION_DAYS dias. Agendado uma vez por dia em
 * routes/console.php; o GET do histórico já esconde os vencidos entre uma
 * execução e outra.
 */
class PruneRecentDestinations implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

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
