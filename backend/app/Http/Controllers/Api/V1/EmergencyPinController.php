<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Passenger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

/**
 * PIN de emergência do passageiro: é ele que desativa o alerta SOS. Definido pelo
 * próprio passageiro (antes era '1234' para todos) e guardado com hash.
 */
class EmergencyPinController extends Controller
{
    /** Tentativas com o PIN atual errado antes de bloquear a troca. */
    public const MAX_ATTEMPTS = 5;

    public const DECAY_SECONDS = 15 * 60;

    /** { hasEmergencyPin } */
    public function show(Request $request)
    {
        $passenger = $this->passenger($request);

        return response()->json(['hasEmergencyPin' => $passenger->hasEmergencyPin()]);
    }

    /**
     * Define o PIN (primeira vez) ou troca (exige o PIN atual: quem pegar o aparelho
     * desbloqueado não consegue trocar o PIN e depois desativar o SOS).
     */
    public function update(Request $request)
    {
        $passenger = $this->passenger($request);

        $v = $request->validate([
            'pin' => ['required', 'string', 'regex:' . Passenger::EMERGENCY_PIN_PATTERN],
            'currentPin' => [$passenger->hasEmergencyPin() ? 'required' : 'nullable', 'string'],
        ], [
            'pin.regex' => 'O PIN de emergência tem 4 dígitos.',
            'currentPin.required' => 'Informe o PIN de emergência atual.',
        ]);

        if ($passenger->hasEmergencyPin()) {
            $key = 'emergency-pin:' . $passenger->id;
            if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
                return $this->tooManyAttempts(RateLimiter::availableIn($key));
            }
            if (!$passenger->checkEmergencyPin($v['currentPin'])) {
                RateLimiter::hit($key, self::DECAY_SECONDS);

                return $this->error('PIN de emergência atual incorreto.', 'INVALID_EMERGENCY_PIN', 422);
            }
            RateLimiter::clear($key);
        }

        if (Passenger::isWeakEmergencyPin($v['pin'])) {
            return $this->error(
                'Escolha um PIN mais difícil de adivinhar: sem números repetidos (0000) nem sequências (1234, 4321).',
                'WEAK_EMERGENCY_PIN',
                422,
            );
        }

        $passenger->emergency_pin = $v['pin'];
        $passenger->save();

        return response()->json(['hasEmergencyPin' => true]);
    }

    private function passenger(Request $request): Passenger
    {
        return Passenger::firstOrCreate(['user_id' => $request->user()->id]);
    }

    private function error(string $message, string $code, int $status)
    {
        return response()->json(['message' => $message, 'error' => $code], $status);
    }

    private function tooManyAttempts(int $seconds)
    {
        $minutes = max(1, (int) ceil($seconds / 60));

        return response()->json([
            'message' => "Muitas tentativas com o PIN errado. Tente de novo em {$minutes} min.",
            'error' => 'TOO_MANY_ATTEMPTS',
            'retryAfterSeconds' => $seconds,
        ], 429);
    }
}
