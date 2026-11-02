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

// Prazo de retenção do histórico de destinos (90 dias sem uso), de madrugada
Schedule::job(new PruneRecentDestinations)
    ->dailyAt('03:30')
    ->timezone('America/Sao_Paulo')
    ->name('prune-recent-destinations');

