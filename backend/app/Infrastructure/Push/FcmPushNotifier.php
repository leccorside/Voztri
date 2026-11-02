<?php

namespace App\Infrastructure\Push;

use App\Models\User;
use App\Models\UserDevice;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Envio pela API FCM HTTP v1. Android vai direto pelo FCM; iOS também, com o
 * Firebase repassando ao APNs (a chave .p8 fica no console do Firebase).
 *
 * Autenticação: JWT RS256 assinado com a chave da conta de serviço, trocado por
 * um access token OAuth2 (válido por 1 h, guardado em cache).
 */
class FcmPushNotifier implements PushNotifier
{
    private const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
    private const CACHE_KEY = 'push.fcm.access_token';

    /**
     * Erros do FCM que significam app desinstalado ou token de outro projeto: o
     * aparelho é removido. INVALID_ARGUMENT fica de fora de propósito: também
     * aparece com payload malformado, e apagar o token esconderia o bug.
     */
    private const DEAD_TOKEN_ERRORS = ['UNREGISTERED', 'SENDER_ID_MISMATCH'];

    /** @param array{project_id: string, client_email: string, private_key: string, token_uri?: string} $credentials */
    public function __construct(private array $credentials) {}

    public static function fromFile(string $path): self
    {
        $json = json_decode((string) file_get_contents($path), true);
        if (!is_array($json) || empty($json['project_id']) || empty($json['client_email']) || empty($json['private_key'])) {
            throw new RuntimeException("Chave da conta de serviço do Firebase inválida: {$path}");
        }

        return new self($json);
    }

    public function isEnabled(): bool
    {
        return true;
    }

    public function sendToUser(User $user, PushMessage $message): int
    {
        $devices = UserDevice::where('user_id', $user->id)
            ->whereNotNull('fcm_token')
            ->whereIn('platform', ['android', 'ios'])
            ->get();

        $delivered = 0;
        foreach ($devices as $device) {
            if ($this->send($device, $message)) {
                $delivered++;
            }
        }

        return $delivered;
    }

    private function send(UserDevice $device, PushMessage $message): bool
    {
        $url = "https://fcm.googleapis.com/v1/projects/{$this->credentials['project_id']}/messages:send";
        $response = Http::withToken($this->accessToken())
            ->acceptJson()
            ->timeout(10)
            ->post($url, ['message' => $this->payload($device->fcm_token, $message)]);

        if ($response->successful()) {
            return true;
        }

        $error = $this->errorCode($response->json());
        if (in_array($error, self::DEAD_TOKEN_ERRORS, true) || $response->status() === 404) {
            // App desinstalado ou token trocado: não insistir nesse aparelho
            $device->delete();
        } else {
            Log::warning('Falha ao enviar push pelo FCM', [
                'status' => $response->status(),
                'error' => $error,
                'device_id' => $device->id,
            ]);
        }

        if ($response->status() === 401) {
            Cache::forget(self::CACHE_KEY);
        }

        return false;
    }

    /** Corpo do campo "message" da API FCM v1. */
    public function payload(string $token, PushMessage $message): array
    {
        $payload = [
            'token' => $token,
            'notification' => ['title' => $message->title, 'body' => $message->body],
            'data' => array_map('strval', $message->data),
            'android' => array_filter([
                'priority' => $message->urgent ? 'HIGH' : 'NORMAL',
                'ttl' => $message->ttlSeconds !== null ? "{$message->ttlSeconds}s" : null,
                'notification' => array_filter([
                    'channel_id' => $message->androidChannel,
                    'tag' => $message->tag,
                    'sound' => 'default',
                ]),
            ], fn ($v) => $v !== null),
            'apns' => [
                'headers' => array_filter([
                    'apns-priority' => $message->urgent ? '10' : '5',
                    'apns-push-type' => 'alert',
                    'apns-collapse-id' => $message->tag,
                    'apns-expiration' => $message->ttlSeconds !== null ? (string) (time() + $message->ttlSeconds) : null,
                ], fn ($v) => $v !== null),
                'payload' => [
                    'aps' => array_filter([
                        'sound' => 'default',
                        'interruption-level' => $message->urgent ? 'time-sensitive' : null,
                    ]),
                ],
            ],
        ];

        if ($payload['data'] === []) {
            unset($payload['data']);
        }

        return $payload;
    }

    private function accessToken(): string
    {
        return Cache::remember(self::CACHE_KEY, now()->addMinutes(55), function () {
            $tokenUri = $this->credentials['token_uri'] ?? 'https://oauth2.googleapis.com/token';
            $response = Http::asForm()->timeout(10)->post($tokenUri, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $this->signedJwt($tokenUri),
            ]);

            if (!$response->successful() || !$response->json('access_token')) {
                throw new RuntimeException('Não foi possível obter o token de acesso do FCM: HTTP ' . $response->status());
            }

            return $response->json('access_token');
        });
    }

    private function signedJwt(string $audience): string
    {
        $now = time();
        $encode = fn (array $part) => rtrim(strtr(base64_encode(json_encode($part, JSON_UNESCAPED_SLASHES)), '+/', '-_'), '=');

        $unsigned = $encode(['alg' => 'RS256', 'typ' => 'JWT']) . '.' . $encode([
            'iss' => $this->credentials['client_email'],
            'scope' => self::SCOPE,
            'aud' => $audience,
            'iat' => $now,
            'exp' => $now + 3600,
        ]);

        if (!openssl_sign($unsigned, $signature, $this->credentials['private_key'], OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Não foi possível assinar o JWT do FCM (chave privada inválida).');
        }

        return $unsigned . '.' . rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    }

    private function errorCode(?array $body): ?string
    {
        foreach ($body['error']['details'] ?? [] as $detail) {
            if (isset($detail['errorCode'])) {
                return $detail['errorCode'];
            }
        }

        return $body['error']['status'] ?? null;
    }
}
