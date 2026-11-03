<?php

namespace App\Infrastructure\Sms;

use Illuminate\Support\Facades\Log;

/**
 * Usado enquanto não há provedor de SMS contratado: não envia nada, só registra no
 * log (com o telefone mascarado), para ver em desenvolvimento o texto que sairia.
 */
class LogSmsSender implements SmsSender
{
    public function send(string $phone, string $text): bool
    {
        Log::info('SMS desligado (sem provedor); mensagem não enviada.', [
            'to' => self::mask($phone),
            'text' => $text,
        ]);

        return false;
    }

    public function isEnabled(): bool
    {
        return false;
    }

    /** 11987654321 → ******4321 (o log não guarda o telefone do contato). */
    public static function mask(string $phone): string
    {
        return str_repeat('*', max(0, strlen($phone) - 4)) . substr($phone, -4);
    }
}
