<?php

namespace App\Infrastructure\Push;

/**
 * Notificação push independente do provedor.
 *
 * @param array<string, string> $data Dados entregues ao app (o FCM só aceita strings).
 */
final class PushMessage
{
    public function __construct(
        public readonly string $title,
        public readonly string $body,
        public readonly array $data = [],
        /** Segundos até a mensagem perder o sentido (não é entregue depois disso). */
        public readonly ?int $ttlSeconds = null,
        /** Canal Android (precisa existir no app) e agrupamento da notificação. */
        public readonly ?string $androidChannel = null,
        public readonly ?string $tag = null,
        /** Alta prioridade: acorda o aparelho (Doze no Android, time-sensitive no iOS). */
        public readonly bool $urgent = false,
    ) {}
}
