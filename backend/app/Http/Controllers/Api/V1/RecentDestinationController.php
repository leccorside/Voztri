<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\RecentDestination;
use Illuminate\Http\Request;

/**
 * Histórico dos últimos destinos do passageiro. A gravação acontece na
 * solicitação da corrida (RideController::requestRide); aqui só se lê e remove.
 */
class RecentDestinationController extends Controller
{
    /** { recent: [AddressLocation + id] }, do mais recente para o mais antigo. */
    public function index(Request $request)
    {
        $recent = RecentDestination::where('user_id', $request->user()->id)
            ->orderByDesc('used_at')
            ->limit(RecentDestination::LIMIT)
            ->get();

        return response()->json(['recent' => $recent->map->toAddress()->values()]);
    }

    /** Remove um destino do histórico (sem erro se já não estava; só os da própria conta). */
    public function destroy(Request $request, string $id)
    {
        RecentDestination::where('user_id', $request->user()->id)->whereKey($id)->delete();

        return response()->noContent();
    }
}
