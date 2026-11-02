<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AccountDeletionService;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    /** Palavra que o usuário digita no app para confirmar. */
    public const CONFIRMATION = 'EXCLUIR';

    public function __construct(private AccountDeletionService $deletion) {}

    /**
     * Exclui a conta do próprio usuário (passageiro ou motorista). Exige a palavra de
     * confirmação, para uma chamada por engano não apagar a conta, e nenhuma corrida
     * em aberto. Administradores não se excluem por aqui.
     */
    public function destroy(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'admin') {
            return response()->json([
                'message' => 'Contas de administrador não são excluídas pelo app.',
                'error' => 'FORBIDDEN',
            ], 403);
        }

        $request->validate([
            'confirmation' => 'required|string|in:' . self::CONFIRMATION,
        ], [
            'confirmation.required' => 'Digite ' . self::CONFIRMATION . ' para confirmar.',
            'confirmation.in' => 'Digite ' . self::CONFIRMATION . ' para confirmar.',
        ]);

        if ($this->deletion->hasOpenRide($user)) {
            return response()->json([
                'message' => 'Você tem uma corrida em andamento. Conclua ou cancele a corrida antes de excluir a conta.',
                'error' => 'RIDE_IN_PROGRESS',
            ], 409);
        }

        $this->deletion->delete($user, $request->ip());

        return response()->json(['message' => 'Sua conta foi excluída.']);
    }
}
