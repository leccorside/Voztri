<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Passenger;
use App\Models\Driver;
use App\Models\UserProfile;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AuthController extends Controller
{
    private const OTP_TTL_MINUTES = 10;

    /**
     * Solicita código OTP via SMS
     */
    public function requestOtp(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string|min:10|max:20',
            // "admin" não é aceito: administradores só existem via seed/painel,
            // nunca por autocadastro (antes qualquer telefone novo virava admin).
            'role' => 'nullable|string|in:passenger,driver',
        ]);

        $phone = $this->normalizePhone($validated['phone']);
        $requestedRole = $validated['role'] ?? 'passenger';

        $user = User::firstOrCreate(
            ['phone' => $phone],
            [
                'name' => 'Usuário VOZTRI',
                'role' => $requestedRole,
                'status' => 'active',
            ]
        );

        // O papel vem do usuário persistido, não da requisição: um admin ou
        // motorista já existente não ganha registro de passageiro ao logar.
        $role = $user->role;

        $otpCode = $this->issueOtp($user);

        // Cria perfil e registro de passageiro/motorista se não existir
        if (!$user->profile) {
            UserProfile::create([
                'user_id' => $user->id,
                'rating_avg' => 5.00,
                'total_ratings' => 0,
            ]);
        }

        if ($role === 'passenger' && !$user->passenger) {
            Passenger::create([
                'user_id' => $user->id,
                'emergency_pin' => '1234',
            ]);
        } elseif ($role === 'driver' && !$user->driver) {
            Driver::create([
                'user_id' => $user->id,
                'cnh_number' => '00000000000',
                'cnh_category' => 'B',
                'cnh_expires_at' => Carbon::now()->addYears(5),
                'cnh_has_ear' => true,
                'status' => 'approved',
                'is_online' => false,
            ]);
        }

        return response()->json([
            'message' => 'Código de verificação enviado com sucesso.',
            'expires_in_seconds' => self::OTP_TTL_MINUTES * 60,
            'debug_otp' => config('app.debug') ? $otpCode : null,
        ]);
    }

    /**
     * Valida OTP e autentica o usuário emitindo token Bearer Sanctum
     */
    public function verifyOtp(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'code' => 'required|string|size:6',
        ]);

        $user = User::where('phone', $this->normalizePhone($validated['phone']))->first();

        return $this->completeOtpLogin($user, $validated['code']);
    }

    /**
     * Solicita OTP para o painel administrativo.
     *
     * Diferente do fluxo público, nunca cria usuário: só gera código para um
     * administrador ativo já existente. A resposta é a mesma em todos os casos,
     * para não revelar quais telefones pertencem a administradores.
     */
    public function requestAdminOtp(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string|min:10|max:20',
        ]);

        $admin = User::where('phone', $this->normalizePhone($validated['phone']))
            ->where('role', 'admin')
            ->where('status', 'active')
            ->first();

        $otpCode = $admin ? $this->issueOtp($admin) : null;

        return response()->json([
            'message' => 'Se o telefone pertencer a um administrador, o código de verificação foi enviado.',
            'expires_in_seconds' => self::OTP_TTL_MINUTES * 60,
            // Só em desenvolvimento (APP_DEBUG). Aqui ele revela se o telefone é
            // de um admin, o que é aceitável fora de produção.
            'debug_otp' => config('app.debug') ? $otpCode : null,
        ]);
    }

    /**
     * Valida o OTP do painel administrativo. Só emite token para administradores
     * ativos; qualquer outro usuário recebe o mesmo erro de código inválido,
     * mesmo que tenha um OTP válido emitido pelo fluxo público.
     */
    public function verifyAdminOtp(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'code' => 'required|string|size:6',
        ]);

        $admin = User::where('phone', $this->normalizePhone($validated['phone']))
            ->where('role', 'admin')
            ->where('status', 'active')
            ->first();

        return $this->completeOtpLogin($admin, $validated['code']);
    }

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\D/', '', $phone);
    }

    /**
     * Gera e grava o OTP do usuário. Em desenvolvimento/demonstração o código é
     * fixo; a troca por um código aleatório + envio por SMS fica centralizada aqui.
     */
    private function issueOtp(User $user): string
    {
        $otpCode = '123456';

        $user->otp_code = $otpCode;
        $user->otp_expires_at = Carbon::now()->addMinutes(self::OTP_TTL_MINUTES);
        $user->save();

        return $otpCode;
    }

    /**
     * Confere o OTP, invalida o código usado e emite o token Sanctum.
     */
    private function completeOtpLogin(?User $user, string $code)
    {
        if (!$user || $user->otp_code === null || !hash_equals($user->otp_code, $code)) {
            return response()->json([
                'message' => 'Código de verificação inválido ou expirado.',
                'error' => 'INVALID_OTP',
            ], 422);
        }

        if ($user->otp_expires_at && Carbon::now()->isAfter($user->otp_expires_at)) {
            return response()->json([
                'message' => 'Código expirado. Solicite um novo código.',
                'error' => 'EXPIRED_OTP',
            ], 422);
        }

        // Limpa OTP usado
        $user->otp_code = null;
        $user->otp_expires_at = null;
        $user->save();

        // Emite token de acesso pessoal Sanctum
        $token = $user->createToken('voztri_auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'avatar_url' => $user->avatar_url,
            ],
        ]);
    }

    /**
     * Retorna dados do usuário autenticado
     */
    public function me(Request $request)
    {
        $user = $request->user();
        $user->load(['profile', 'passenger', 'driver.activeVehicle']);

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => $user->email,
            'cpf' => $user->cpf,
            'avatar_url' => $user->avatar_url,
            'role' => $user->role,
            'status' => $user->status,
            'profile' => $user->profile,
            'passenger' => $user->passenger,
            'driver' => $user->driver,
        ]);
    }

    /**
     * Atualiza dados de perfil
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => 'nullable|string|min:2|max:100',
            'email' => 'nullable|email|unique:users,email,'.$user->id,
            'cpf' => 'nullable|string|max:14|unique:users,cpf,'.$user->id,
        ]);

        $user->update(array_filter($validated));

        return response()->json([
            'message' => 'Perfil atualizado com sucesso.',
            'user' => $user,
        ]);
    }
}

