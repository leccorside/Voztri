<?php

namespace App\Jobs;

use App\Infrastructure\Sms\LogSmsSender;
use App\Infrastructure\Sms\SmsSender;
use App\Models\Ride;
use App\Models\SafetyIncident;
use App\Models\TrustedContact;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

/**
 * Avisa por SMS os contatos de confiança do passageiro quando ele aciona o SOS
 * (onde ele está, o carro e a placa) e quando o desativa com o PIN.
 */
class NotifyTrustedContactsOfSos implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public const TRIGGERED = 'triggered';

    public const RESOLVED = 'resolved';

    /** Um provedor fora do ar não pode engolir o aviso de emergência. */
    public int $tries = 3;

    public array $backoff = [10, 30];

    public function __construct(public string $incidentId, public string $event) {}

    public function handle(SmsSender $sms): void
    {
        $incident = SafetyIncident::find($this->incidentId);
        $ride = $incident ? Ride::with(['passenger.user', 'driver.user', 'driver.activeVehicle'])->find($incident->ride_id) : null;
        if (!$ride?->passenger) {
            return;
        }

        $contacts = TrustedContact::where('passenger_id', $ride->passenger->id)->orderBy('created_at')->get();
        if ($contacts->isEmpty()) {
            return;
        }

        $text = $this->event === self::RESOLVED
            ? self::resolvedText($ride)
            : self::triggeredText($ride, (float) $incident->latitude, (float) $incident->longitude);

        $sent = 0;
        foreach ($contacts as $contact) {
            // Uma falha num contato não impede o aviso aos outros
            try {
                $sent += $sms->send($contact->phone, $text) ? 1 : 0;
            } catch (\Throwable $e) {
                report($e);
            }
        }

        Log::info('SOS: aviso aos contatos de confiança.', [
            'incident_id' => $incident->id,
            'event' => $this->event,
            'contacts' => $contacts->count(),
            'accepted' => $sent,
            'to' => $contacts->map(fn ($c) => LogSmsSender::mask($c->phone))->all(),
        ]);
    }

    /** Nome que o login dá a quem ainda não preencheu o perfil. */
    private const DEFAULT_NAME = 'Usuário VOZTRI';

    /** Primeiro nome (o SMS é curto e o contato conhece a pessoa). */
    private static function firstName(?string $name): string
    {
        $first = trim(explode(' ', trim((string) $name))[0] ?? '');

        return $first !== '' ? $first : 'Seu contato';
    }

    /**
     * Quem acionou: primeiro nome e o celular, ex.: "Beatriz ((11) 99999-1111)". O
     * celular identifica a pessoa mesmo sem nome no perfil ("Usuário VOZTRI").
     */
    private static function who(Ride $ride): string
    {
        $user = $ride->passenger?->user;
        $name = $user && $user->name !== self::DEFAULT_NAME ? self::firstName($user->name) : 'Seu contato';
        $digits = preg_replace('/\D/', '', (string) $user?->phone);

        return strlen($digits) === 11
            ? sprintf('%s ((%s) %s-%s)', $name, substr($digits, 0, 2), substr($digits, 2, 5), substr($digits, 7))
            : $name;
    }

    public static function triggeredText(Ride $ride, float $lat, float $lng): string
    {
        $who = self::who($ride);
        $parts = ["VOZTRI: {$who} acionou o alerta de emergência (SOS) durante uma corrida."];
        $parts[] = 'Local: https://maps.google.com/?q=' . round($lat, 6) . ',' . round($lng, 6);

        $vehicle = $ride->driver?->activeVehicle;
        if ($vehicle) {
            $driver = self::firstName($ride->driver->user?->name);
            $parts[] = "Carro: {$vehicle->brand} {$vehicle->model} {$vehicle->color}, placa {$vehicle->plate} (motorista {$driver}).";
        }
        $parts[] = 'Nossa central 24h foi avisada. Se não conseguir falar com a pessoa, ligue 190.';

        return implode(' ', $parts);
    }

    public static function resolvedText(Ride $ride): string
    {
        $who = self::who($ride);

        return "VOZTRI: {$who} desativou o alerta de emergência com o PIN pessoal. O alerta foi encerrado.";
    }
}
