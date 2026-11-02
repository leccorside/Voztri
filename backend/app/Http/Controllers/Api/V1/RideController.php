<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Ride\Services\ArrivalDetector;
use App\Domain\Ride\Services\FareCalculator;
use App\Domain\Ride\Services\RideDispatcher;
use App\Domain\Ride\Services\RideStateMachine;
use App\Http\Controllers\Controller;
use App\Http\Presenters\RidePresenter;
use App\Jobs\ExpireRideSearch;
use App\Jobs\SendRideStatusPush;
use App\Models\Driver;
use App\Models\FinancialLedger;
use App\Models\Passenger;
use App\Models\RecentDestination;
use App\Models\Ride;
use App\Models\RideChatMessage;
use App\Models\RideOffer;
use App\Models\SafetyIncident;
use App\Models\City;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RideController extends Controller
{
    /** Status em que a corrida ainda está em andamento (não terminal). */
    private const OPEN_STATUSES = ['REQUESTED', 'SEARCHING', 'OFFERED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'];

    public function __construct(
        private FareCalculator $fares,
        private RideDispatcher $dispatcher,
        private RideStateMachine $stateMachine,
        private RidePresenter $presenter,
        private ArrivalDetector $arrivals,
    ) {}

    /**
     * Estimativa de rota e tarifas para as 4 categorias
     */
    public function estimate(Request $request)
    {
        $v = $request->validate([
            'origin.latitude' => 'required|numeric|between:-90,90',
            'origin.longitude' => 'required|numeric|between:-180,180',
            'destination.latitude' => 'required|numeric|between:-90,90',
            'destination.longitude' => 'required|numeric|between:-180,180',
        ]);

        return response()->json($this->fares->estimates(
            $v['origin']['latitude'], $v['origin']['longitude'],
            $v['destination']['latitude'], $v['destination']['longitude'],
        ));
    }

    /**
     * Passageiro solicita uma corrida; o preço é o mesmo da estimativa e a
     * corrida já é oferecida ao motorista disponível mais próximo.
     */
    public function requestRide(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'passenger') {
            return $this->error('Somente passageiros podem solicitar corridas.', 'FORBIDDEN', 403);
        }

        $v = $request->validate([
            'origin.address' => 'required|string|max:255',
            'origin.latitude' => 'required|numeric|between:-90,90',
            'origin.longitude' => 'required|numeric|between:-180,180',
            'destination.address' => 'required|string|max:255',
            'destination.latitude' => 'required|numeric|between:-90,90',
            'destination.longitude' => 'required|numeric|between:-180,180',
            // Título e cidade do destino (para o histórico); o app sempre envia
            'destination.shortAddress' => 'nullable|string|max:120',
            'destination.city' => 'nullable|string|max:100',
            'destination.state' => 'nullable|string|max:50',
            'category' => 'required|string|in:pop,black,mulher,moto',
            'paymentMethod' => 'required|string|in:pix,credit_card,cash,wallet',
        ]);

        $passenger = Passenger::firstOrCreate(['user_id' => $user->id], ['emergency_pin' => '1234']);

        $active = Ride::where('passenger_id', $passenger->id)->whereIn('status', self::OPEN_STATUSES)->first();
        if ($active) {
            return response()->json([
                'message' => 'Você já tem uma corrida em andamento.',
                'error' => 'RIDE_ALREADY_ACTIVE',
                'ride' => $this->presenter->present($active, $user),
            ], 409);
        }

        $o = $v['origin'];
        $d = $v['destination'];
        $route = $this->fares->route($o['latitude'], $o['longitude'], $d['latitude'], $d['longitude']);
        $price = $this->fares->priceCents($v['category'], $route['distanceKm'], $route['minutes']);

        $city = City::firstOrCreate(['name' => 'São Paulo'], ['state' => 'SP', 'is_active' => true]);

        $ride = DB::transaction(function () use ($user, $passenger, $city, $v, $o, $d, $route, $price) {
            $ride = Ride::create([
                'passenger_id' => $passenger->id,
                'city_id' => $city->id,
                'category' => $v['category'],
                'status' => 'REQUESTED',
                'pickup_address' => $o['address'],
                'dropoff_address' => $d['address'],
                'boarding_pin' => sprintf('%04d', random_int(0, 9999)),
                'payment_method' => $v['paymentMethod'],
                'payment_status' => 'pending',
                'estimated_price_cents' => $price,
                'final_price_cents' => $price,
                'distance_meters' => (int) round($route['distanceKm'] * 1000),
                'duration_seconds' => $route['minutes'] * 60,
            ]);

            DB::update(
                'UPDATE rides SET pickup_location = ST_SetSRID(ST_MakePoint(?, ?), 4326),
                                  dropoff_location = ST_SetSRID(ST_MakePoint(?, ?), 4326)
                 WHERE id = ?',
                [$o['longitude'], $o['latitude'], $d['longitude'], $d['latitude'], $ride->id]
            );

            $this->stateMachine->transition($ride, 'SEARCHING', $user->id);
            $this->dispatcher->offerNext($ride);
            // Timeout da busca mesmo sem polling (app do passageiro minimizado)
            ExpireRideSearch::dispatch($ride->id)
                ->delay($this->dispatcher->searchDeadline($ride))
                ->afterCommit();

            return $ride;
        });

        // Histórico dos últimos destinos: não pode impedir a corrida, que já foi criada
        try {
            RecentDestination::record($user, $d);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json($this->presenter->present($ride->fresh(), $user), 201);
    }

    /**
     * Dados da corrida (polling do passageiro). Também expira ofertas vencidas
     * e redespacha a corrida enquanto ela procura motorista.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $ride = Ride::findOrFail($id);

        if (!$this->canView($ride, $user)) {
            return $this->forbidden();
        }

        if (in_array($ride->status, ['SEARCHING', 'OFFERED'], true)) {
            $ride = $this->dispatcher->refresh($ride);
        }

        return response()->json($this->presenter->present($ride->fresh(), $user));
    }

    /**
     * Motorista aceita a oferta recebida (proteção atômica de concorrência)
     */
    public function accept(Request $request, $id)
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->first();
        if (!$driver) {
            return $this->forbidden();
        }

        return DB::transaction(function () use ($id, $driver, $user) {
            $ride = Ride::lockForUpdate()->findOrFail($id);
            $offer = RideOffer::where('ride_id', $ride->id)
                ->where('driver_id', $driver->id)
                ->where('status', 'sent')
                ->lockForUpdate()
                ->first();

            if (!$offer) {
                return $this->error('Esta corrida não foi oferecida a você.', 'NO_OFFER', 403);
            }

            if ($ride->status !== 'OFFERED') {
                return $this->error('Esta corrida não está mais disponível.', 'RIDE_UNAVAILABLE', 409);
            }

            if ($offer->expires_at->isPast()) {
                $offer->update(['status' => 'expired']);
                $this->stateMachine->transition($ride, 'SEARCHING', null, ['reason' => 'offer_expired']);
                $this->dispatcher->offerNext($ride);
                return $this->error('A oferta expirou.', 'OFFER_EXPIRED', 409);
            }

            $busy = Ride::where('driver_id', $driver->id)->whereIn('status', RideDispatcher::DRIVER_BUSY_STATUSES)->exists();
            if ($busy) {
                return $this->error('Você já está em uma corrida.', 'DRIVER_BUSY', 409);
            }

            $offer->update(['status' => 'accepted']);
            $ride->driver_id = $driver->id;
            $this->stateMachine->transition($ride, 'ACCEPTED', $user->id, ['offer_id' => $offer->id]);
            // O motorista parte imediatamente para o embarque
            $this->stateMachine->transition($ride, 'DRIVER_EN_ROUTE', $user->id);
            SendRideStatusPush::dispatch($ride->id, SendRideStatusPush::EN_ROUTE)->afterCommit();

            return response()->json($this->presenter->present($ride->fresh(), $user));
        });
    }

    /**
     * Motorista avisa que chegou ao embarque (o passageiro recebe um push).
     * Só vale perto do embarque (até ArrivalDetector::MANUAL_MAX_METERS): o app
     * manda a posição atual; sem ela, usa a última recebida, se for recente.
     * Repetir o aviso não reenvia a notificação. Normalmente a chegada já é
     * marcada sozinha pelo /driver/location.
     */
    public function arrived(Request $request, $id)
    {
        $user = $request->user();
        $v = $request->validate([
            'latitude' => 'nullable|required_with:longitude|numeric|between:-90,90',
            'longitude' => 'nullable|required_with:latitude|numeric|between:-180,180',
        ]);

        return DB::transaction(function () use ($id, $user, $v) {
            $ride = Ride::lockForUpdate()->findOrFail($id);
            if (!$this->isAssignedDriver($ride, $user)) {
                return $this->forbidden();
            }

            if ($ride->status === 'DRIVER_ARRIVED') {
                return response()->json($this->presenter->present($ride->fresh(), $user));
            }
            if ($ride->status !== 'DRIVER_EN_ROUTE') {
                return $this->error('A corrida não está a caminho do embarque.', 'INVALID_STATE', 409);
            }

            $driver = $ride->driver;
            if (isset($v['latitude'])) {
                // A posição enviada também atualiza a do motorista (despacho e mapa)
                $driver->forceFill([
                    'current_latitude' => $v['latitude'],
                    'current_longitude' => $v['longitude'],
                    'last_location_at' => Carbon::now(),
                ])->save();
                [$lat, $lng] = [(float) $v['latitude'], (float) $v['longitude']];
            } elseif (
                $driver->last_location_at
                && $driver->last_location_at->gt(Carbon::now()->subSeconds(ArrivalDetector::POSITION_MAX_AGE_SECONDS))
                && $driver->current_latitude !== null
            ) {
                [$lat, $lng] = [(float) $driver->current_latitude, (float) $driver->current_longitude];
            } else {
                return $this->error(
                    'Não foi possível confirmar sua localização. Ative o GPS e tente de novo, ou valide o PIN com o passageiro.',
                    'LOCATION_REQUIRED',
                    422,
                );
            }

            $meters = $this->arrivals->distanceToPickup($ride, $lat, $lng);
            if ($meters !== null && $meters > ArrivalDetector::MANUAL_MAX_METERS) {
                return response()->json([
                    'message' => sprintf(
                        'Você está a %s do embarque. Avise a chegada quando estiver a até %d m.',
                        self::formatDistance($meters),
                        ArrivalDetector::MANUAL_MAX_METERS,
                    ),
                    'error' => 'TOO_FAR_FROM_PICKUP',
                    'distanceMeters' => (int) round($meters),
                    'maxDistanceMeters' => ArrivalDetector::MANUAL_MAX_METERS,
                ], 422);
            }

            $this->arrivals->markArrived($ride, $user->id, 'manual', $meters);

            return response()->json($this->presenter->present($ride->fresh(), $user));
        });
    }

    /** "450 m" ou "1,2 km". */
    private static function formatDistance(float $meters): string
    {
        return $meters < 1000
            ? ((int) round($meters / 10) * 10) . ' m'
            : number_format($meters / 1000, 1, ',', '.') . ' km';
    }

    /**
     * Motorista recusa a oferta; a corrida segue para o próximo motorista
     */
    public function reject(Request $request, $id)
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->first();
        if (!$driver) {
            return $this->forbidden();
        }

        return DB::transaction(function () use ($id, $driver, $user) {
            $ride = Ride::lockForUpdate()->findOrFail($id);
            $offer = RideOffer::where('ride_id', $ride->id)
                ->where('driver_id', $driver->id)
                ->where('status', 'sent')
                ->first();

            if (!$offer) {
                return $this->error('Não há oferta pendente desta corrida para você.', 'NO_OFFER', 404);
            }

            $offer->update(['status' => 'rejected']);

            if ($ride->status === 'OFFERED') {
                $this->stateMachine->transition($ride, 'SEARCHING', $user->id, ['reason' => 'offer_rejected']);
                $this->dispatcher->offerNext($ride);
            }

            return response()->json(['success' => true, 'message' => 'Oferta recusada.']);
        });
    }

    /**
     * Validação do PIN de 4 dígitos no embarque (inicia a viagem)
     */
    public function validatePin(Request $request, $id)
    {
        $user = $request->user();
        $v = $request->validate(['pin' => 'required|string|size:4']);

        $ride = Ride::findOrFail($id);
        if (!$this->isAssignedDriver($ride, $user)) {
            return $this->forbidden();
        }

        if (!in_array($ride->status, ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED'], true)) {
            return $this->error('A corrida não está aguardando embarque.', 'INVALID_STATE', 409);
        }

        if (!hash_equals($ride->boarding_pin, $v['pin'])) {
            return $this->error('PIN de embarque incorreto.', 'INVALID_PIN', 422);
        }

        DB::transaction(function () use ($ride, $user) {
            if ($ride->status === 'DRIVER_EN_ROUTE') {
                // Validar o PIN no local de embarque confirma a chegada do motorista
                $this->stateMachine->transition($ride, 'DRIVER_ARRIVED', $user->id);
            }
            $this->stateMachine->transition($ride, 'IN_PROGRESS', $user->id);
        });

        return response()->json($this->presenter->present($ride->fresh(), $user));
    }

    /**
     * Conclui a corrida e lança os repasses no ledger
     */
    public function complete(Request $request, $id)
    {
        $user = $request->user();
        $ride = Ride::findOrFail($id);

        if (!$this->isAssignedDriver($ride, $user)) {
            return $this->forbidden();
        }

        if ($ride->status !== 'IN_PROGRESS') {
            return $this->error('Somente corridas em andamento podem ser concluídas.', 'INVALID_STATE', 409);
        }

        DB::transaction(function () use ($ride, $user) {
            $this->stateMachine->transition($ride, 'COMPLETED', $user->id);
            SendRideStatusPush::dispatch($ride->id, SendRideStatusPush::COMPLETED)->afterCommit();

            $totalCents = (int) $ride->final_price_cents;
            $driverNetCents = $this->fares->driverNetCents($totalCents);
            $platformCommissionCents = $totalCents - $driverNetCents;

            FinancialLedger::create([
                'reference_id' => $ride->id,
                'reference_type' => 'ride',
                'account_type' => 'driver_balance',
                'account_id' => $ride->driver_id,
                'entry_type' => 'credit',
                'amount_cents' => $driverNetCents,
                'balance_after_cents' => $driverNetCents,
                'description' => "Recebimento líquido corrida #{$ride->id}",
                // Explícito: o default do banco é UTC e os ganhos são agrupados no fuso da aplicação
                'created_at' => Carbon::now(),
            ]);

            FinancialLedger::create([
                'reference_id' => $ride->id,
                'reference_type' => 'ride',
                'account_type' => 'platform_revenue',
                'account_id' => $ride->city_id,
                'entry_type' => 'credit',
                'amount_cents' => $platformCommissionCents,
                'balance_after_cents' => $platformCommissionCents,
                'description' => "Comissão (15%) corrida #{$ride->id}",
                'created_at' => Carbon::now(),
            ]);
        });

        return response()->json($this->presenter->present($ride->fresh(), $user));
    }

    /**
     * Cancela a corrida (passageiro dono ou motorista atribuído)
     */
    public function cancel(Request $request, $id)
    {
        $user = $request->user();
        $v = $request->validate(['reason' => 'required|string|min:3|max:255']);

        $ride = Ride::findOrFail($id);
        if (!$this->isPassengerOwner($ride, $user) && !$this->isAssignedDriver($ride, $user)) {
            return $this->forbidden();
        }

        if (!in_array($ride->status, self::OPEN_STATUSES, true)) {
            return $this->error('Esta corrida já foi encerrada.', 'INVALID_STATE', 409);
        }

        DB::transaction(function () use ($ride, $user, $v) {
            RideOffer::where('ride_id', $ride->id)->where('status', 'sent')->update(['status' => 'expired']);
            $ride->cancellation_reason = $v['reason'];
            $this->stateMachine->transition($ride, 'CANCELLED', $user->id);
            // Só o cancelamento pelo motorista gera push (o job confere quem cancelou)
            if ($this->isAssignedDriver($ride, $user)) {
                SendRideStatusPush::dispatch($ride->id, SendRideStatusPush::CANCELLED)->afterCommit();
            }
        });

        return response()->json($this->presenter->present($ride->fresh(), $user));
    }

    /**
     * Aciona a Central de Emergência SOS 24h (passageiro)
     */
    public function triggerSos(Request $request, $id)
    {
        $user = $request->user();
        $v = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $ride = Ride::findOrFail($id);
        if (!$this->isPassengerOwner($ride, $user)) {
            return $this->forbidden();
        }

        $incident = SafetyIncident::create([
            'ride_id' => $ride->id,
            'reported_by' => $user->id,
            'type' => 'sos_trigger',
            'latitude' => $v['latitude'],
            'longitude' => $v['longitude'],
            'status' => 'active',
            'notes' => 'Alerta SOS 24h disparado pelo aplicativo móvel.',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Alerta de emergência SOS acionado! Nossa central 24h foi notificada.',
            'incidentId' => $incident->id,
        ]);
    }

    /**
     * Desativa o alerta SOS com o PIN de emergência do passageiro
     */
    public function cancelSos(Request $request, $id)
    {
        $user = $request->user();
        $v = $request->validate(['emergencyPin' => 'required|string']);

        $ride = Ride::findOrFail($id);
        if (!$this->isPassengerOwner($ride, $user)) {
            return $this->forbidden();
        }

        $pin = (string) $ride->passenger->emergency_pin;
        if ($pin === '' || !hash_equals($pin, $v['emergencyPin'])) {
            return $this->error('PIN de segurança inválido.', 'INVALID_EMERGENCY_PIN', 422);
        }

        SafetyIncident::where('ride_id', $ride->id)
            ->where('status', 'active')
            ->update([
                'status' => 'resolved',
                'resolved_at' => Carbon::now(),
                'notes' => 'Desativado com autenticação do usuário.',
            ]);

        return response()->json(['success' => true, 'message' => 'Alerta SOS desativado com sucesso.']);
    }

    /**
     * Envia mensagem no chat da corrida (participantes)
     */
    public function sendChatMessage(Request $request, $id)
    {
        $user = $request->user();
        $v = $request->validate(['message' => 'required|string|max:500']);

        $ride = Ride::findOrFail($id);
        $role = $this->participantRole($ride, $user);
        if (!$role) {
            return $this->forbidden();
        }

        $msg = RideChatMessage::create([
            'ride_id' => $ride->id,
            'sender_id' => $user->id,
            'sender_role' => $role,
            'message' => $v['message'],
        ]);

        return response()->json($this->presentMessage($msg), 201);
    }

    /**
     * Histórico do chat da corrida (participantes)
     */
    public function getChatMessages(Request $request, $id)
    {
        $user = $request->user();
        $ride = Ride::findOrFail($id);
        if (!$this->participantRole($ride, $user)) {
            return $this->forbidden();
        }

        $messages = RideChatMessage::where('ride_id', $ride->id)->orderBy('created_at')->orderBy('id')->get();

        return response()->json($messages->map(fn ($m) => $this->presentMessage($m))->values());
    }

    // ------------------------------------------------------------------ apoio

    private function isPassengerOwner(Ride $ride, User $user): bool
    {
        return Passenger::where('id', $ride->passenger_id)->where('user_id', $user->id)->exists();
    }

    private function isAssignedDriver(Ride $ride, User $user): bool
    {
        return $ride->driver_id !== null
            && Driver::where('id', $ride->driver_id)->where('user_id', $user->id)->exists();
    }

    /** 'passenger' | 'driver' | null */
    private function participantRole(Ride $ride, User $user): ?string
    {
        if ($this->isPassengerOwner($ride, $user)) {
            return 'passenger';
        }

        return $this->isAssignedDriver($ride, $user) ? 'driver' : null;
    }

    private function canView(Ride $ride, User $user): bool
    {
        if ($user->role === 'admin' || $this->participantRole($ride, $user)) {
            return true;
        }

        // Motorista que recebeu oferta desta corrida
        $driver = Driver::where('user_id', $user->id)->first();

        return $driver && RideOffer::where('ride_id', $ride->id)->where('driver_id', $driver->id)->exists();
    }

    private function presentMessage(RideChatMessage $m): array
    {
        return [
            'id' => $m->id,
            'rideId' => $m->ride_id,
            'senderId' => $m->sender_id,
            'senderRole' => $m->sender_role,
            'text' => $m->message,
            'createdAt' => $m->created_at?->toIso8601String(),
            'readAt' => $m->read_at?->toIso8601String(),
        ];
    }

    private function forbidden(): JsonResponse
    {
        return $this->error('Você não tem acesso a esta corrida.', 'FORBIDDEN', 403);
    }

    private function error(string $message, string $code, int $status): JsonResponse
    {
        return response()->json(['message' => $message, 'error' => $code], $status);
    }
}
