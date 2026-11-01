<?php

namespace App\Infrastructure\Payments;

use App\Domain\Billing\Contracts\PaymentGatewayInterface;
use Illuminate\Support\Str;
use Carbon\Carbon;

class MockPaymentGateway implements PaymentGatewayInterface
{
    public function createPixCharge(int $amountCents, string $description, array $customerData): array
    {
        $txId = 'PIX_MOCK_' . Str::upper(Str::random(12));
        $pixCopyPaste = "00020126580014br.gov.bcb.pix0136" . Str::uuid() . "5204000053039865405" . number_format($amountCents / 100, 2, '.', '') . "5802BR5910VOZTRI BRASIL6009SAO PAULO62070503***6304ABCD";

        return [
            'transaction_id' => $txId,
            'qr_code_url' => 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' . urlencode($pixCopyPaste),
            'pix_copy_paste' => $pixCopyPaste,
            'expires_at' => Carbon::now()->addMinutes(15)->toIso8601String(),
        ];
    }

    public function processCreditCard(int $amountCents, string $cardToken, string $description): array
    {
        return [
            'transaction_id' => 'CC_MOCK_' . Str::upper(Str::random(12)),
            'status' => 'paid',
            'authorization_code' => 'AUTH_' . rand(100000, 999999),
        ];
    }

    public function transferPixPayout(int $amountCents, string $pixKey, string $pixKeyType): array
    {
        return [
            'transfer_id' => 'TRANSFER_MOCK_' . Str::upper(Str::random(12)),
            'status' => 'completed',
        ];
    }

    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        return true;
    }
}

