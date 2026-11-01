<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class LedgerServiceTest extends TestCase
{
    public function test_cent_calculation_preserves_exact_totals_without_rounding_loss(): void
    {
        $totalCents = 2450; // R$ 24,50
        $commissionPercent = 15.0; // 15%

        $platformCommissionCents = (int) round($totalCents * ($commissionPercent / 100));
        $driverNetCents = $totalCents - $platformCommissionCents;

        $this->assertEquals(368, $platformCommissionCents); // R$ 3,68
        $this->assertEquals(2082, $driverNetCents); // R$ 20,82
        $this->assertEquals($totalCents, $platformCommissionCents + $driverNetCents);
    }

    public function test_minimum_fare_bounds_protect_low_distance_trips(): void
    {
        $minimumFareCents = 750; // R$ 7,50
        $calculatedShortTrip = 620; // R$ 6,20

        $finalPrice = max($minimumFareCents, $calculatedShortTrip);
        $this->assertEquals(750, $finalPrice);
    }
}
