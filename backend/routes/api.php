<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\RideController;
use App\Http\Controllers\Api\V1\DriverController;
use App\Http\Controllers\Api\V1\BillingController;
use App\Http\Controllers\Api\V1\AdminController;

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
    });

    // Rotas Protegidas (Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        // Usuário & Perfil
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/auth/profile', [AuthController::class, 'updateProfile']);

        // Passageiro & Corridas
        Route::prefix('rides')->group(function () {
            Route::post('/estimate', [RideController::class, 'estimate']);
            Route::post('/request', [RideController::class, 'requestRide']);
            Route::get('/{id}', [RideController::class, 'show']);
            Route::post('/{id}/cancel', [RideController::class, 'cancel']);
            Route::post('/{id}/accept', [RideController::class, 'accept']);
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

