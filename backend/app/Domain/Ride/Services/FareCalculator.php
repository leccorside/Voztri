<?php

namespace App\Domain\Ride\Services;

/**
 * Cálculo de tarifa por categoria. Usado tanto pela estimativa quanto pela
 * solicitação da corrida, para que o passageiro pague o valor que viu.
 */
class FareCalculator
{
    public const CATEGORIES = [
        'pop' => [
            'categoryName' => 'VozTri Pop',
            'base' => 500, // R$ 5,00
            'perKm' => 220, // R$ 2,20/km
            'perMin' => 30, // R$ 0,30/min
            'min' => 750, // R$ 7,50
            'description' => 'Viagens diárias com melhor custo-benefício',
        ],
        'black' => [
            'categoryName' => 'VozTri Black',
            'base' => 900,
            'perKm' => 340,
            'perMin' => 50,
            'min' => 1400,
            'description' => 'Veículos premium com motoristas top de linha',
        ],
        'mulher' => [
            'categoryName' => 'VozTri Mulher',
            'base' => 550,
            'perKm' => 230,
            'perMin' => 32,
            'min' => 800,
            'description' => 'Exclusivo: passageiras com motoristas mulheres',
        ],
        'moto' => [
            'categoryName' => 'VozTri Moto',
            'base' => 350,
            'perKm' => 140,
            'perMin' => 20,
            'min' => 500,
            'description' => 'Chegue rápido e economize até 40%',
        ],
    ];

    public const PLATFORM_COMMISSION_PERCENT = 15.0;

    /**
     * Distância viária (Haversine x 1,35 de fator urbano) e tempo a 28 km/h.
     *
     * @return array{distanceKm: float, minutes: int}
     */
    public function route(float $lat1, float $lon1, float $lat2, float $lon2): array
    {
        $earthRadiusKm = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        $directKm = $earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a));

        $distanceKm = round(max(1.0, $directKm * 1.35), 2);
        $minutes = max(4, (int) round(($distanceKm / 28) * 60));

        return ['distanceKm' => $distanceKm, 'minutes' => $minutes];
    }

    public function priceCents(string $category, float $distanceKm, int $minutes): int
    {
        $c = self::CATEGORIES[$category];
        $raw = $c['base'] + ($distanceKm * $c['perKm']) + ($minutes * $c['perMin']);

        return (int) max($c['min'], round($raw));
    }

    /** Valor líquido do motorista (total menos a comissão da plataforma). */
    public function driverNetCents(int $totalCents): int
    {
        return $totalCents - (int) round($totalCents * (self::PLATFORM_COMMISSION_PERCENT / 100));
    }

    public static function format(int $cents): string
    {
        return 'R$ ' . number_format($cents / 100, 2, ',', '.');
    }

    /** Estimativas das 4 categorias no formato de FareEstimate (shared-types). */
    public function estimates(float $lat1, float $lon1, float $lat2, float $lon2): array
    {
        ['distanceKm' => $km, 'minutes' => $min] = $this->route($lat1, $lon1, $lat2, $lon2);

        $out = [];
        foreach (self::CATEGORIES as $category => $c) {
            $price = $this->priceCents($category, $km, $min);
            $out[] = [
                'category' => $category,
                'categoryName' => $c['categoryName'],
                'priceCents' => $price,
                'formattedPrice' => self::format($price),
                'estimatedMinutes' => $min,
                'distanceKm' => $km,
                'surgeMultiplier' => 1.0,
                'description' => $c['description'],
            ];
        }

        return $out;
    }
}
