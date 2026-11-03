<?php

namespace App\Infrastructure\Sms;

/**
 * Envio de SMS (aviso aos contatos de confiança no SOS; no futuro, o OTP do login).
 */
interface SmsSender
{
    /**
     * Envia o texto para um telefone brasileiro só com dígitos (DDD + número).
     *
     * @return bool O provedor aceitou a mensagem?
     */
    public function send(string $phone, string $text): bool;

    /** O envio real está configurado (há um provedor de SMS)? */
    public function isEnabled(): bool;
}
