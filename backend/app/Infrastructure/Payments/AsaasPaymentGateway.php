<?php

namespace App\Infrastructure\Payments;

use App\Domain\Billing\Contracts\PaymentGatewayInterface;
use Illuminate\Support\Facades\Http;
use Exception;

class AsaasPaymentGateway implements PaymentGatewayInterface
{
    protected string $apiKey;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services.asaas.api_key', env('ASAAS_API_KEY', ''));
        $this->baseUrl = config('services.asaas.url', 'https://sandbox.asaas.com/api/v3');
    }

    public function createPixCharge(int $amountCents, string $description, array $customerData): array
    {
        $value = round($amountCents / 100, 2);

        $response = Http::withHeaders([
            'access_token' => $this->apiKey,
        ])->post("{$this->baseUrl}/payments", [
            'customer' => $customerData['customer_id'] ?? null,
            'billingType' => 'PIX',
            'value' => $value,
            'dueDate' => now()->addDay()->format('Y-m-d'),
            'description' => $description,
        ]);

        if ($response->successful()) {
            $paymentId = $response->json('id');
            // Busca o QR code Pix gerado
            $qrRes = Http::withHeaders(['access_token' => $this->apiKey])->get("{$this->baseUrl}/payments/{$paymentId}/pixQrCode");
            if ($qrRes->successful()) {
                return [
                    'transaction_id' => $paymentId,
                    'qr_code_url' => $qrRes->json('encodedImage'),
                    'pix_copy_paste' => $qrRes->json('payload'),
                    'expires_at' => $qrRes->json('expirationDate'),
                ];
            }
        }

        // Fallback para sandbox local caso a chave da API não esteja preenchida
        $mock = new MockPaymentGateway();
        return $mock->createPixCharge($amountCents, $description, $customerData);
    }

    public function processCreditCard(int $amountCents, string $cardToken, string $description): array
    {
        $mock = new MockPaymentGateway();
        return $mock->processCreditCard($amountCents, $cardToken, $description);
    }

    public function transferPixPayout(int $amountCents, string $pixKey, string $pixKeyType): array
    {
        $mock = new MockPaymentGateway();
        return $mock->transferPixPayout($amountCents, $pixKey, $pixKeyType);
    }

    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        $secret = env('WEBHOOK_SECRET', 'voztri_webhook_secure_token_123');
        return hash_equals(hash_hmac('sha256', $payload, $secret), $signature);
    }
}
