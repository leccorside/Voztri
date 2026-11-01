<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Ride\Services\FareCalculator;
use App\Domain\Ride\Services\RideDispatcher;
use App\Http\Controllers\Controller;
use App\Http\Presenters\RidePresenter;
use App\Models\RideOffer;
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
            'isOnline' => 'required|boolean',
        ]);

        if ($validated['isOnline'] && $driver->status !== 'approved') {
            return response()->json([
                'message' => 'Seu cadastro ainda não foi aprovado para receber corridas.',
                'error' => 'DRIVER_NOT_APPROVED',
            ], 403);
        }

        $driver->is_online = $validated['isOnline'];
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
            'isOnline' => $driver->is_online,
            'message' => $driver->is_online ? 'Você está online e pronto para receber corridas!' : 'Você está offline.',
        ]);
    }

    /**
     * Situação atual do motorista (polling do app): corrida em andamento ou
     * oferta pendente. Também expira ofertas vencidas, liberando a corrida para
     * o próximo motorista.
     */
    public function currentRides(Request $request, RideDispatcher $dispatcher, RidePresenter $presenter, FareCalculator $fares)
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->firstOrFail();

        $ride = Ride::where('driver_id', $driver->id)
            ->whereIn('status', RideDispatcher::DRIVER_BUSY_STATUSES)
            ->latest('updated_at')
            ->first();

        if ($ride) {
            return response()->json([
                'isOnline' => (bool) $driver->is_online,
                'offer' => null,
                'ride' => $presenter->present($ride, $user),
            ]);
        }

        // Ofertas vencidas deste motorista: a corrida volta a procurar motorista
        RideOffer::where('driver_id', $driver->id)
            ->where('status', 'sent')
            ->where('expires_at', '<=', Carbon::now())
            ->get()
            ->each(fn (RideOffer $o) => $dispatcher->refresh(Ride::findOrFail($o->ride_id)));

        $offer = $dispatcher->activeOfferFor($driver);
        $offerRide = $offer ? Ride::with('passenger.user')->find($offer->ride_id) : null;

        return response()->json([
            'isOnline' => (bool) $driver->is_online,
            'offer' => $offerRide ? [
                'rideId' => $offerRide->id,
                'expiresAt' => $offer->expires_at->toIso8601String(),
                // Carbon 3 devolve float em diffInSeconds; o app exibe segundos inteiros
                'secondsLeft' => max(0, (int) floor(Carbon::now()->diffInSeconds($offer->expires_at, false))),
                'timeoutSeconds' => RideDispatcher::OFFER_TIMEOUT_SECONDS,
                'pickupAddress' => $offerRide->pickup_address,
                'dropoffAddress' => $offerRide->dropoff_address,
                'distanceKm' => round($offerRide->distance_meters / 1000, 1),
                'durationMinutes' => (int) round($offerRide->duration_seconds / 60),
                'earningsCents' => $fares->driverNetCents((int) $offerRide->final_price_cents),
                'category' => $offerRide->category,
                'categoryName' => FareCalculator::CATEGORIES[$offerRide->category]['categoryName'] ?? $offerRide->category,
                'paymentMethod' => $offerRide->payment_method,
                'passengerName' => $offerRide->passenger?->user?->name,
            ] : null,
            'ride' => null,
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
        $startOfWeek = Carbon::today()->startOfWeek();

        // Ganhos líquidos (após a comissão) lançados no ledger por corrida
        $rideCredits = FinancialLedger::where('account_type', 'driver_balance')
            ->where('account_id', $driver->id)
            ->where('entry_type', 'credit')
            ->where('reference_type', 'ride');

        $todayEarnings = (clone $rideCredits)->whereDate('created_at', $today)->sum('amount_cents');
        $weekEarnings = (clone $rideCredits)->where('created_at', '>=', $startOfWeek)->sum('amount_cents');

        $perDay = (clone $rideCredits)
            ->where('created_at', '>=', $startOfWeek)
            ->selectRaw('DATE(created_at) AS day, SUM(amount_cents) AS cents')
            ->groupBy('day')
            ->pluck('cents', 'day');

        $labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        $daily = [];
        for ($i = 0; $i < 7; $i++) {
            $date = $startOfWeek->copy()->addDays($i);
            $daily[] = [
                'date' => $date->toDateString(),
                'label' => $labels[$i],
                'cents' => (int) ($perDay[$date->toDateString()] ?? 0),
                'isToday' => $date->isSameDay($today),
            ];
        }

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

        $user->loadMissing('profile');

        return response()->json([
            'isOnline' => (bool) $driver->is_online,
            'todayCents' => (int) $todayEarnings,
            'weekCents' => (int) $weekEarnings,
            'daily' => $daily,
            'ridesCount' => $ridesCount,
            'availableBalanceCents' => (int) $availableBalanceCents,
            'pendingBalanceCents' => 0,
            // Ainda não há registro de sessões online; o app mostra "—"
            'onlineHours' => null,
            'rating' => $user->profile ? (float) $user->profile->rating_avg : null,
            'pixKey' => $driver->pix_key,
            'pixKeyType' => $driver->pix_key_type,
        ]);
    }
}

