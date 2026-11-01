<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Domain\Promotion\Services\CouponService;

class CouponServiceTest extends TestCase
{
    public function test_can_apply_fixed_discount_coupon(): void
    {
        $service = new CouponService();
        $res = $service->applyCoupon('BEMVINDOVOZ', 2500); // R$ 25,00

        $this->assertTrue($res['valid']);
        $this->assertEquals(1000, $res['discount_cents']); // R$ 10,00 off
        $this->assertEquals(1500, $res['final_price_cents']); // R$ 15,00 final
    }

    public function test_rejects_coupon_when_below_minimum_ride_amount(): void
    {
        $service = new CouponService();
        $res = $service->applyCoupon('BEMVINDOVOZ', 1200); // R$ 12,00 (mínimo é 20,00)

        $this->assertFalse($res['valid']);
        $this->assertEquals(0, $res['discount_cents']);
        $this->assertEquals(1200, $res['final_price_cents']);
    }

    public function test_caps_percentage_coupon_to_maximum_discount(): void
    {
        $service = new CouponService();
        $res = $service->applyCoupon('VOZTRI10', 10000); // 10% de R$ 100,00 seria 10,00, mas o teto é 8,00

        $this->assertTrue($res['valid']);
        $this->assertEquals(800, $res['discount_cents']);
        $this->assertEquals(9200, $res['final_price_cents']);
    }
}

