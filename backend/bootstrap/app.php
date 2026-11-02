<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);
    })
    ->withSingletons([
        // Push: FCM quando a chave da conta de serviço existe; senão, desligado (só log)
        \App\Infrastructure\Push\PushNotifier::class => function () {
            $path = config('services.fcm.credentials');

            return $path && is_file($path)
                ? \App\Infrastructure\Push\FcmPushNotifier::fromFile($path)
                : new \App\Infrastructure\Push\NullPushNotifier();
        },
        // Geocodificação reversa (endereço do embarque pelo GPS)
        \App\Infrastructure\Geo\ReverseGeocoder::class => \App\Infrastructure\Geo\PhotonGeocodingService::class,
    ])
    ->withExceptions(function (Exceptions $exceptions) {
        // Formato padronizado de erro JSON
    })->create();

