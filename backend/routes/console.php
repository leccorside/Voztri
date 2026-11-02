<?php

use App\Jobs\PruneRecentDestinations;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Tarefas agendadas: o contêiner "scheduler" roda `php artisan schedule:work`
// (em produção, `schedule:run` a cada minuto pelo cron). Os jobs vão para a fila
// e são executados pelo "worker".

// As travas do agendador (onOneServer, withoutOverlapping) ficam no Redis,
// compartilhado por todos os servidores, independente do CACHE_STORE do ambiente
Schedule::useCache('redis');

// Prazo de retenção do histórico de destinos (90 dias sem uso), de madrugada.
// onOneServer: com vários servidores rodando o agendador, só um dispara.
// withoutOverlapping: não dispara de novo enquanto o disparo anterior não
// terminou; a trava expira em 10 min se o processo morrer segurando-a.
Schedule::job(new PruneRecentDestinations)
    ->dailyAt('03:30')
    ->timezone('America/Sao_Paulo')
    ->name('prune-recent-destinations')
    ->onOneServer()
    ->withoutOverlapping(10);

