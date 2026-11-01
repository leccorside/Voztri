<?php

namespace App\Domain\Promotion\Services;

class CouponService
{
    protected array $activeCoupons = [
        'BEMVINDOVOZ' => [
            'type' => 'fixed',
            'value_cents' => 1000, // R$ 10,00 de desconto
            'min_ride_cents' => 2000, // Corrida mínima de R$ 20,00
            'max_uses' => 1,
        ],
        'VOZTRI10' => [
            'type' => 'percentage',
            'percent' => 10, // 10% de desconto
            'max_discount_cents' => 800, // R$ 8,00 no máximo
            'min_ride_cents' => 1500,
        ],
    ];

    /**
     * Aplica cupom de desconto sobre o valor bruto da corrida
     */
    public function applyCoupon(string $code, int $ridePriceCents): array
    {
        $code = strtoupper(trim($code));

        if (!isset($this->activeCoupons[$code])) {
            return [
                'valid' => false,
                'discount_cents' => 0,
                'final_price_cents' => $ridePriceCents,
                'message' => 'Cupom inválido ou expirado.',
            ];
        }

        $coupon = $this->activeCoupons[$code];

        if ($ridePriceCents < $coupon['min_ride_cents']) {
            $minFormatted = 'R$ ' . number_format($coupon['min_ride_cents'] / 100, 2, ',', '.');
            return [
                'valid' => false,
                'discount_cents' => 0,
                'final_price_cents' => $ridePriceCents,
                'message' => "O valor da corrida deve ser de no mínimo {$minFormatted} para este cupom.",
            ];
        }

        $discountCents = 0;
        if ($coupon['type'] === 'fixed') {
            $discountCents = $coupon['value_cents'];
        } elseif ($coupon['type'] === 'percentage') {
            $calc = (int) round($ridePriceCents * ($coupon['percent'] / 100));
            $discountCents = min($calc, $coupon['max_discount_cents']);
        }

        $finalPrice = max(500, $ridePriceCents - $discountCents); // Garante mínimo R$ 5,00

        return [
            'valid' => true,
            'discount_cents' => $discountCents,
            'final_price_cents' => $finalPrice,
            'message' => 'Cupom aplicado com sucesso!',
        ];
    }
}

