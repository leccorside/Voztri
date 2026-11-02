<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\RideController;
use App\Http\Controllers\Api\V1\DriverController;
use App\Http\Controllers\Api\V1\BillingController;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\DeviceController;
use App\Http\Controllers\Api\V1\GeoController;
use App\Http\Controllers\Api\V1\SavedPlaceController;
use App\Http\Controllers\Api\V1\RecentDestinationController;
use App\Http\Controllers\Api\V1\EmergencyPinController;

Route::prefix('v1')->group(function () {
    // Health Check
    Route::get('/health', function () {
        return response()->json([
            'status' => 'healthy',
            'app' => 'VOZTRI Backend API',
            'version' => '1.0.0',
            'timestamp' => now()->toISOString(),
        ]);
    });

    // Autenticação Pública
    Route::prefix('auth')->group(function () {
        Route::post('/request-otp', [AuthController::class, 'requestOtp']);
        Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);

        // Login do painel administrativo: nunca cria usuário e só autentica
        // administradores ativos. Limite de 5 tentativas/minuto por IP contra
        // força bruta do código de 6 dígitos.
        Route::prefix('admin')->middleware('throttle:5,1')->group(function () {
            Route::post('/request-otp', [AuthController::class, 'requestAdminOtp']);
            Route::post('/verify-otp', [AuthController::class, 'verifyAdminOtp']);
        });
    });

    // Rotas Protegidas (Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        // Usuário & Perfil
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/auth/profile', [AuthController::class, 'updateProfile']);

        // Endereço da coordenada do GPS (embarque do passageiro); limite por usuário
        Route::get('/geo/reverse', [GeoController::class, 'reverse'])->middleware('throttle:30,1');
        // Busca de destino pelo texto (o app espera a digitação parar antes de chamar)
        Route::get('/geo/search', [GeoController::class, 'search'])->middleware('throttle:60,1');

        // PIN de emergência do passageiro (desativa o SOS); limite contra força bruta
        Route::prefix('passenger')->middleware('role:passenger')->group(function () {
            Route::get('/emergency-pin', [EmergencyPinController::class, 'show']);
            Route::put('/emergency-pin', [EmergencyPinController::class, 'update'])->middleware('throttle:10,1');
        });

        // Endereços salvos do passageiro (Casa e Trabalho) e histórico dos últimos destinos
        Route::prefix('places')->middleware('role:passenger')->group(function () {
            Route::get('/recent', [RecentDestinationController::class, 'index']);
            Route::delete('/recent', [RecentDestinationController::class, 'clear']);
            Route::delete('/recent/{id}', [RecentDestinationController::class, 'destroy'])->whereUuid('id');
            Route::get('/', [SavedPlaceController::class, 'index']);
            Route::put('/{kind}', [SavedPlaceController::class, 'update'])->whereIn('kind', ['home', 'work']);
            Route::delete('/{kind}', [SavedPlaceController::class, 'destroy'])->whereIn('kind', ['home', 'work']);
        });

        // Aparelhos para notificações push
        Route::post('/devices', [DeviceController::class, 'store']);
        Route::delete('/devices', [DeviceController::class, 'destroy']);

        // Passageiro & Corridas
        Route::prefix('rides')->group(function () {
            Route::post('/estimate', [RideController::class, 'estimate']);
            Route::post('/request', [RideController::class, 'requestRide']);
            Route::get('/{id}', [RideController::class, 'show']);
            Route::post('/{id}/cancel', [RideController::class, 'cancel']);
            Route::post('/{id}/accept', [RideController::class, 'accept']);
            Route::post('/{id}/reject', [RideController::class, 'reject']);
            Route::post('/{id}/arrived', [RideController::class, 'arrived']);
            Route::post('/{id}/validate-pin', [RideController::class, 'validatePin']);
            Route::post('/{id}/complete', [RideController::class, 'complete']);
            Route::post('/{id}/sos', [RideController::class, 'triggerSos']);
            Route::post('/{id}/sos/cancel', [RideController::class, 'cancelSos']);
            Route::post('/{id}/chat', [RideController::class, 'sendChatMessage']);
            Route::get('/{id}/chat', [RideController::class, 'getChatMessages']);
        });

        // Motorista
        Route::prefix('driver')->group(function () {
            Route::post('/register', [DriverController::class, 'register']);
            Route::post('/documents', [DriverController::class, 'uploadDocument']);
            Route::post('/status', [DriverController::class, 'toggleStatus']);
            Route::get('/rides/current', [DriverController::class, 'currentRides']);
            Route::post('/location', [DriverController::class, 'updateLocation']);
            Route::get('/earnings', [DriverController::class, 'getEarnings']);
        });

        // Faturamento & Carteira
        Route::prefix('billing')->group(function () {
            Route::post('/rides/{id}/pix', [BillingController::class, 'generatePix']);
            Route::get('/cards', [BillingController::class, 'getCards']);
            Route::post('/payout', [BillingController::class, 'requestPayout']);
            Route::post('/rating', [BillingController::class, 'submitRating']);
        });

        // Painel Administrativo Master
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('/stats', [AdminController::class, 'getStats']);
            Route::get('/live-map', [AdminController::class, 'getLiveMap']);
            Route::get('/drivers', [AdminController::class, 'listDrivers']);
            Route::post('/drivers/{id}/approve', [AdminController::class, 'approveDriver']);
            Route::post('/drivers/{id}/block', [AdminController::class, 'blockDriver']);
            Route::get('/rides', [AdminController::class, 'listRides']);
            Route::get('/audit-logs', [AdminController::class, 'getAuditLogs']);
        });
    });

    // Webhooks Externos (Asaas / Mercado Pago com validação de assinatura)
    Route::post('/webhooks/payments', [BillingController::class, 'handleWebhook']);
});

