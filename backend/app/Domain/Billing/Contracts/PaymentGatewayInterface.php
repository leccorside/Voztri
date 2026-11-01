<?php

namespace App\Domain\Billing\Contracts;

interface PaymentGatewayInterface
{
    /**
     * Cria cobrança Pix dinâmica
     *
     * @param int $amountCents
     * @param string $description
     * @param array $customerData
     * @return array [transaction_id, qr_code_url, pix_copy_paste, expires_at]
     */
    public function createPixCharge(int $amountCents, string $description, array $customerData): array;

    /**
     * Processa pagamento por cartão tokenizado
     *
     * @param int $amountCents
     * @param string $cardToken
     * @param string $description
     * @return array [transaction_id, status, authorization_code]
     */
    public function processCreditCard(int $amountCents, string $cardToken, string $description): array;

    /**
     * Realiza repasse / transferência Pix para o motorista
     *
     * @param int $amountCents
     * @param string $pixKey
     * @param string $pixKeyType
     * @return array [transfer_id, status]
     */
    public function transferPixPayout(int $amountCents, string $pixKey, string $pixKeyType): array;

    /**
     * Valida assinatura de webhook
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool;
}
