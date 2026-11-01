<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Driver;
use App\Models\DriverVehicle;
use App\Models\DriverDocument;
use App\Models\FinancialLedger;
use App\Models\Ride;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Carbon\Carbon;

class DriverController extends Controller
{
    /**
     * Cadastro complementar de motorista e veículo
     */
    public function register(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'cnh_number' => 'required|string|min:8|max:20',
            'cnh_category' => 'required|string|max:5',
            'cnh_expires_at' => 'required|date',
            'cnh_has_ear' => 'required|boolean',
            'vehicle_brand' => 'required|string|max:50',
            'vehicle_model' => 'required|string|max:50',
            'vehicle_year' => 'required|integer|min:2010',
            'vehicle_color' => 'required|string|max:30',
            'vehicle_plate' => 'required|string|max:10',
            'vehicle_category' => 'required|string|in:pop,black,mulher,moto',
        ]);

        $driver = Driver::updateOrCreate(
            ['user_id' => $user->id],
            [
                'cnh_number' => $validated['cnh_number'],
                'cnh_category' => $validated['cnh_category'],
                'cnh_expires_at' => $validated['cnh_expires_at'],
                'cnh_has_ear' => $validated['cnh_has_ear'],
                'status' => 'approved', // Auto-aprovado para dev/sandbox
            ]
        );

        DriverVehicle::updateOrCreate(
            ['driver_id' => $driver->id],
            [
                'brand' => $validated['vehicle_brand'],
                'model' => $validated['vehicle_model'],
                'year' => $validated['vehicle_year'],
                'color' => $validated['vehicle_color'],
                'plate' => strtoupper($validated['vehicle_plate']),
                'category' => $validated['vehicle_category'],
                'is_active' => true,
            ]
        );

        $user->role = 'driver';
        $user->save();

        return response()->json([
            'message' => 'Cadastro de motorista realizado com sucesso.',
            'driver' => $driver->load('activeVehicle'),
        ]);
    }

    /**
     * Envio de documentos (CNH / CRLV)
     */
    public function uploadDocument(Request $request)
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->firstOrFail();

        $validated = $request->validate([
            'type' => 'required|string|in:cnh,crlv,background_check,photo',
            'document_url' => 'required|string',
        ]);

        $doc = DriverDocument::create([
            'driver_id' => $driver->id,
            'type' => $validated['type'],
            'document_url' => $validated['document_url'],
            'status' => 'approved',
        ]);

        return response()->json([
            'message' => 'Documento enviado com sucesso.',
            'document' => $doc,
        ]);
    }

    /**
     * Altera disponibilidade operacional (Online/Offline)
     */
    public function toggleStatus(Request $request)
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->firstOrFail();

        $validated = $request->validate([
            'is_online' => 'required|boolean',
        ]);

        $driver->is_online = $validated['is_online'];
        $driver->save();

        // Se ficou offline, remove do Redis GEO para não receber despachos
        if (!$driver->is_online) {
            try {
                Redis::zrem('driver_geo', $driver->id);
            } catch (\Exception $e) {
                // Redis opcional se desconectado
            }
        }

        return response()->json([
            'is_online' => $driver->is_online,
            'message' => $driver->is_online ? 'Você está online e pronto para receber corridas!' : 'Você está offline.',
        ]);
    }

    /**
     * Atualiza localização GPS do motorista em tempo real
     */
    public function updateLocation(Request $request)
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->firstOrFail();

        $validated = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'heading' => 'nullable|numeric|between:0,360',
            'speed' => 'nullable|numeric|min:0',
        ]);

        $driver->current_latitude = $validated['latitude'];
        $driver->current_longitude = $validated['longitude'];
        $driver->last_location_at = Carbon::now();
        $driver->save();

        // Atualiza no Redis GEOADD para busca de despacho ultra-rápida
        try {
            Redis::geoadd('driver_geo', $validated['longitude'], $validated['latitude'], $driver->id);
            Redis::setex("driver_meta:{$driver->id}", 60, json_encode([
                'heading' => $validated['heading'] ?? 0,
                'speed' => $validated['speed'] ?? 0,
                'updated_at' => Carbon::now()->toIso8601String(),
            ]));
        } catch (\Exception $e) {
            // Continua
        }

        return response()->json(['success' => true]);
    }

    /**
     * Extrato de ganhos e métricas operacionais
     */
    public function getEarnings(Request $request)
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->firstOrFail();

        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek();

        $todayEarnings = Ride::where('driver_id', $driver->id)
            ->where('status', 'COMPLETED')
            ->whereDate('completed_at', $today)
            ->sum('final_price_cents');

        $weekEarnings = Ride::where('driver_id', $driver->id)
            ->where('status', 'COMPLETED')
            ->where('completed_at', '>=', $startOfWeek)
            ->sum('final_price_cents');

        $ridesCount = Ride::where('driver_id', $driver->id)
            ->where('status', 'COMPLETED')
            ->whereDate('completed_at', $today)
            ->count();

        // Calcula saldo real a partir do Ledger financeiro
        $credits = FinancialLedger::where('account_type', 'driver_balance')
            ->where('account_id', $driver->id)
            ->where('entry_type', 'credit')
            ->sum('amount_cents');

        $debits = FinancialLedger::where('account_type', 'driver_balance')
            ->where('account_id', $driver->id)
            ->where('entry_type', 'debit')
            ->sum('amount_cents');

        $availableBalanceCents = max(0, $credits - $debits);

        return response()->json([
            'today_cents' => (int) $todayEarnings,
            'week_cents' => (int) $weekEarnings,
            'rides_count' => $ridesCount,
            'available_balance_cents' => (int) $availableBalanceCents,
            'pending_balance_cents' => 0,
            'online_hours' => 6.5,
            'pix_key' => $driver->pix_key ?? $user->cpf ?? '123.456.789-00',
        ]);
    }
}
