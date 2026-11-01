<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Ride;
use App\Models\RideOffer;
use App\Models\RideChatMessage;
use App\Models\SafetyIncident;
use App\Models\Driver;
use App\Models\Passenger;
use App\Models\City;
use App\Models\FareRule;
use App\Models\FinancialLedger;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class RideController extends Controller
{
    /**
     * Calcula estimativa de rota e tarifas para todas as categorias
     */
    public function estimate(Request $request)
    {
        $validated = $request->validate([
            'origin.latitude' => 'required|numeric',
            'origin.longitude' => 'required|numeric',
            'destination.latitude' => 'required|numeric',
            'destination.longitude' => 'required|numeric',
        ]);

        $lat1 = $validated['origin']['latitude'];
        $lon1 = $validated['origin']['longitude'];
        $lat2 = $validated['destination']['latitude'];
        $lon2 = $validated['destination']['longitude'];

        // Cálculo de distância Haversine com fator viário (1.35x para malha urbana)
        $earthRadiusKm = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2) * sin($dLon/2);
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        $directKm = $earthRadiusKm * $c;
        $roadDistanceKm = round(max(1.0, $directKm * 1.35), 2);
        $estimatedMinutes = max(4, (int) round(($roadDistanceKm / 28) * 60)); // velocidade média urbana 28 km/h

        // Estimativa para as 4 categorias com base no modelo de precificação
        $categories = [
            [
                'category' => 'pop',
                'categoryName' => 'VozTri Pop',
                'base' => 500, // R$ 5,00
                'perKm' => 220, // R$ 2,20/km
                'perMin' => 30, // R$ 0,30/min
                'min' => 750, // R$ 7,50
                'description' => 'Viagens diárias com melhor custo-benefício',
            ],
            [
                'category' => 'black',
                'categoryName' => 'VozTri Black',
                'base' => 900, // R$ 9,00
                'perKm' => 340, // R$ 3,40/km
                'perMin' => 50, // R$ 0,50/min
                'min' => 1400, // R$ 14,00
                'description' => 'Veículos premium com motoristas top de linha',
            ],
            [
                'category' => 'mulher',
                'categoryName' => 'VozTri Mulher',
                'base' => 550,
                'perKm' => 230,
                'perMin' => 32,
                'min' => 800,
                'description' => 'Exclusivo: passageiras com motoristas mulheres',
            ],
            [
                'category' => 'moto',
                'categoryName' => 'VozTri Moto',
                'base' => 350,
                'perKm' => 140,
                'perMin' => 20,
                'min' => 500,
                'description' => 'Chegue rápido e economize até 40%',
            ],
        ];

        $estimates = [];
        foreach ($categories as $cat) {
            $rawPrice = $cat['base'] + ($roadDistanceKm * $cat['perKm']) + ($estimatedMinutes * $cat['perMin']);
            $finalPrice = (int) max($cat['min'], round($rawPrice));

            $estimates[] = [
                'category' => $cat['category'],
                'categoryName' => $cat['categoryName'],
                'priceCents' => $finalPrice,
                'formattedPrice' => 'R$ ' . number_format($finalPrice / 100, 2, ',', '.'),
                'estimatedMinutes' => $estimatedMinutes,
                'distanceKm' => $roadDistanceKm,
                'surgeMultiplier' => 1.0,
                'description' => $cat['description'],
            ];
        }

        return response()->json($estimates);
    }

    /**
     * Solicita uma nova corrida
     */
    public function requestRide(Request $request)
    {
        $user = $request->user();
        $passenger = Passenger::where('user_id', $user->id)->firstOrCreate(['user_id' => $user->id]);

        $validated = $request->validate([
            'origin.address' => 'required|string',
            'origin.latitude' => 'required|numeric',
            'origin.longitude' => 'required|numeric',
            'destination.address' => 'required|string',
            'destination.latitude' => 'required|numeric',
            'destination.longitude' => 'required|numeric',
            'category' => 'required|string|in:pop,black,mulher,moto',
            'paymentMethod' => 'required|string|in:pix,credit_card,cash,wallet',
        ]);

        $city = City::firstOrCreate(
            ['name' => 'São Paulo'],
            ['state' => 'SP', 'is_active' => true]
        );

        $boardingPin = sprintf("%04d", rand(1000, 9999));

        // Cria a corrida
        $ride = Ride::create([
            'passenger_id' => $passenger->id,
            'city_id' => $city->id,
            'category' => $validated['category'],
            'status' => 'SEARCHING',
            'pickup_address' => $validated['origin']['address'],
            'dropoff_address' => $validated['destination']['address'],
            'boarding_pin' => $boardingPin,
            'payment_method' => $validated['paymentMethod'],
            'payment_status' => 'pending',
            'estimated_price_cents' => 2450, // R$ 24,50
            'final_price_cents' => 2450,
            'distance_meters' => 6400,
            'duration_seconds' => 900,
        ]);

        // Simula despacho imediato buscando o primeiro motorista online ou simulado
        $driver = Driver::where('is_online', true)->first();
        if ($driver) {
            $ride->driver_id = $driver->id;
            $ride->status = 'ACCEPTED';
            $ride->save();
        }

        return response()->json($ride->load(['passenger.user', 'driver.user', 'driver.activeVehicle']));
    }

    /**
     * Visualiza dados de uma corrida
     */
    public function show($id)
    {
        $ride = Ride::with(['passenger.user', 'driver.user', 'driver.activeVehicle'])->findOrFail($id);
        return response()->json($ride);
    }

    /**
     * Motorista aceita corrida (Proteção atômica de concorrência)
     */
    public function accept(Request $request, $id)
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->firstOrFail();

        return DB::transaction(function () use ($id, $driver) {
            $ride = Ride::lockForUpdate()->findOrFail($id);

            if ($ride->status !== 'SEARCHING' && $ride->status !== 'OFFERED') {
                return response()->json([
                    'message' => 'Esta corrida já foi aceita por outro motorista ou cancelada.',
                    'error' => 'RIDE_UNAVAILABLE',
                ], 409);
            }

            $ride->driver_id = $driver->id;
            $ride->status = 'ACCEPTED';
            $ride->save();

            return response()->json([
                'success' => true,
                'message' => 'Corrida aceita com sucesso!',
                'ride' => $ride->load(['passenger.user', 'driver.user']),
            ]);
        });
    }

    /**
     * Validação do PIN de 4 dígitos no embarque
     */
    public function validatePin(Request $request, $id)
    {
        $validated = $request->validate([
            'pin' => 'required|string|size:4',
        ]);

        $ride = Ride::findOrFail($id);

        if ($ride->boarding_pin !== $validated['pin']) {
            return response()->json([
                'message' => 'PIN de embarque incorreto.',
                'error' => 'INVALID_PIN',
            ], 422);
        }

        $ride->status = 'IN_PROGRESS';
        $ride->started_at = Carbon::now();
        $ride->save();

        return response()->json([
            'success' => true,
            'message' => 'PIN validado! Viagem iniciada.',
            'ride' => $ride,
        ]);
    }

    /**
     * Conclui corrida e processa repasses
     */
    public function complete(Request $request, $id)
    {
        $ride = Ride::findOrFail($id);
        $ride->status = 'COMPLETED';
        $ride->completed_at = Carbon::now();
        $ride->save();

        // Dispara fechamento contábil no Ledger
        $totalCents = $ride->final_price_cents;
        $commissionPercent = 15.0; // 15% taxa VOZTRI
        $platformCommissionCents = (int) round($totalCents * ($commissionPercent / 100));
        $driverNetCents = $totalCents - $platformCommissionCents;

        if ($ride->driver_id) {
            // Crédito líquido ao motorista
            FinancialLedger::create([
                'reference_id' => $ride->id,
                'reference_type' => 'ride',
                'account_type' => 'driver_balance',
                'account_id' => $ride->driver_id,
                'entry_type' => 'credit',
                'amount_cents' => $driverNetCents,
                'balance_after_cents' => $driverNetCents,
                'description' => "Recebimento líquido corrida #{$ride->id}",
            ]);

            // Receita da plataforma VOZTRI
            FinancialLedger::create([
                'reference_id' => $ride->id,
                'reference_type' => 'ride',
                'account_type' => 'platform_revenue',
                'account_id' => $ride->city_id,
                'entry_type' => 'credit',
                'amount_cents' => $platformCommissionCents,
                'balance_after_cents' => $platformCommissionCents,
                'description' => "Comissão (15%) corrida #{$ride->id}",
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Corrida concluída com sucesso!',
            'ride' => $ride,
        ]);
    }

    /**
     * Cancela uma corrida
     */
    public function cancel(Request $request, $id)
    {
        $user = $request->user();
        $validated = $request->validate([
            'reason' => 'required|string|min:3',
        ]);

        $ride = Ride::findOrFail($id);
        $ride->status = 'CANCELLED';
        $ride->cancellation_reason = $validated['reason'];
        $ride->cancelled_by = $user->id;
        $ride->cancelled_at = Carbon::now();
        $ride->save();

        return response()->json([
            'success' => true,
            'message' => 'Corrida cancelada.',
            'ride' => $ride,
        ]);
    }

    /**
     * Aciona Central de Emergência SOS 24h
     */
    public function triggerSos(Request $request, $id)
    {
        $user = $request->user();
        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $incident = SafetyIncident::create([
            'ride_id' => $id,
            'reported_by' => $user->id,
            'type' => 'sos_trigger',
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'status' => 'active',
            'notes' => 'Alerta SOS 24h disparado pelo aplicativo móvel.',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Alerta de emergência SOS acionado! Nossa central 24h foi notificada.',
            'incident_id' => $incident->id,
        ]);
    }

    /**
     * Cancela Alerta SOS com PIN de segurança
     */
    public function cancelSos(Request $request, $id)
    {
        $user = $request->user();
        $passenger = Passenger::where('user_id', $user->id)->first();

        $validated = $request->validate([
            'emergencyPin' => 'required|string',
        ]);

        if ($passenger && $passenger->emergency_pin !== $validated['emergencyPin']) {
            return response()->json([
                'message' => 'PIN de segurança inválido.',
                'error' => 'INVALID_EMERGENCY_PIN',
            ], 422);
        }

        SafetyIncident::where('ride_id', $id)
            ->where('status', 'active')
            ->update([
                'status' => 'resolved',
                'resolved_at' => Carbon::now(),
                'notes' => 'Desativado com autenticação do usuário.',
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Alerta SOS desativado com sucesso.',
        ]);
    }

    /**
     * Envia mensagem no chat da corrida
     */
    public function sendChatMessage(Request $request, $id)
    {
        $user = $request->user();
        $validated = $request->validate([
            'message' => 'required|string|max:500',
        ]);

        $chatMsg = RideChatMessage::create([
            'ride_id' => $id,
            'sender_id' => $user->id,
            'sender_role' => $user->role,
            'message' => $validated['message'],
        ]);

        return response()->json($chatMsg);
    }

    /**
     * Lista histórico de mensagens do chat
     */
    public function getChatMessages($id)
    {
        $messages = RideChatMessage::where('ride_id', $id)->orderBy('created_at', 'asc')->get();
        return response()->json($messages);
    }
}
