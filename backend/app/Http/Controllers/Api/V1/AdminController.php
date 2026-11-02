<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Driver;
use App\Models\Passenger;
use App\Models\Ride;
use App\Models\FinancialLedger;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    /**
     * Estatísticas gerais do Dashboard Operacional
     */
    public function getStats()
    {
        // whereHas('user'): contas excluídas (exclusão lógica) não entram na contagem
        $totalPassengers = Passenger::whereHas('user')->count();
        $totalDrivers = Driver::whereHas('user')->count();
        $onlineDrivers = Driver::where('is_online', true)->count();
        $activeRides = Ride::whereIn('status', ['SEARCHING', 'OFFERED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'IN_PROGRESS'])->count();
        $completedRides = Ride::where('status', 'COMPLETED')->count();
        $cancelledRides = Ride::where('status', 'CANCELLED')->count();

        $grossRevenueCents = Ride::where('status', 'COMPLETED')->sum('final_price_cents');
        $platformRevenueCents = FinancialLedger::where('account_type', 'platform_revenue')->sum('amount_cents');

        return response()->json([
            'passengers_count' => $totalPassengers,
            'drivers_count' => $totalDrivers,
            'online_drivers_count' => $onlineDrivers,
            'active_rides_count' => $activeRides,
            'completed_rides_count' => $completedRides,
            'cancelled_rides_count' => $cancelledRides,
            'gross_revenue_cents' => (int) $grossRevenueCents,
            'platform_revenue_cents' => (int) $platformRevenueCents,
            'average_rating' => 4.88,
        ]);
    }

    /**
     * Dados em tempo real para o mapa operacional ao vivo
     */
    public function getLiveMap()
    {
        $drivers = Driver::with(['user', 'activeVehicle'])
            ->where('is_online', true)
            ->get()
            ->map(function ($driver) {
                return [
                    'id' => $driver->id,
                    'name' => $driver->user->name ?? 'Motorista VOZTRI',
                    'latitude' => $driver->current_latitude ?? -23.550520,
                    'longitude' => $driver->current_longitude ?? -46.633308,
                    'vehicle' => $driver->activeVehicle ? "{$driver->activeVehicle->brand} {$driver->activeVehicle->model}" : 'Carro Padrão',
                    'plate' => $driver->activeVehicle->plate ?? 'BRA2E19',
                    'category' => $driver->activeVehicle->category ?? 'pop',
                ];
            });

        $activeRides = Ride::with(['passenger.user', 'driver.user'])
            ->whereIn('status', ['ACCEPTED', 'DRIVER_EN_ROUTE', 'IN_PROGRESS'])
            ->get();

        return response()->json([
            'drivers' => $drivers,
            'activeRides' => $activeRides,
        ]);
    }

    /**
     * Lista motoristas com filtros e paginação
     */
    public function listDrivers(Request $request)
    {
        $drivers = Driver::with(['user', 'activeVehicle', 'documents'])->whereHas('user')->paginate(15);
        return response()->json($drivers);
    }

    /**
     * Aprova cadastro e documentos do motorista
     */
    public function approveDriver(Request $request, $id)
    {
        $driver = Driver::findOrFail($id);
        $driver->status = 'approved';
        $driver->save();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'driver_approval',
            'target_entity' => 'drivers',
            'target_id' => $driver->id,
            'ip_address' => $request->ip(),
            'new_values' => ['status' => 'approved'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Motorista aprovado com sucesso!',
        ]);
    }

    /**
     * Bloqueia motorista
     */
    public function blockDriver(Request $request, $id)
    {
        $driver = Driver::findOrFail($id);
        $driver->status = 'blocked';
        $driver->is_online = false;
        $driver->save();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'driver_block',
            'target_entity' => 'drivers',
            'target_id' => $driver->id,
            'ip_address' => $request->ip(),
            'new_values' => ['status' => 'blocked'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Motorista bloqueado com sucesso.',
        ]);
    }

    /**
     * Lista corridas no painel administrativo
     */
    public function listRides(Request $request)
    {
        $rides = Ride::with(['passenger.user', 'driver.user'])->orderBy('created_at', 'desc')->paginate(20);
        return response()->json($rides);
    }

    /**
     * Lista trilha de auditoria
     */
    public function getAuditLogs()
    {
        $logs = AuditLog::with('user')->orderBy('created_at', 'desc')->paginate(25);
        return response()->json($logs);
    }
}

