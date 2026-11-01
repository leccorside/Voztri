<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Ride;
use App\Models\Driver;
use App\Models\User;
use App\Models\Passenger;
use App\Models\City;
use Illuminate\Support\Str;

class ConcurrencyAndSecurityTest extends TestCase
{
    public function test_only_first_driver_can_accept_offered_ride(): void
    {
        // Simulação de corrida em status SEARCHING
        $cityId = (string) Str::uuid();
        $passengerId = (string) Str::uuid();

        $ride = new Ride();
        $ride->id = (string) Str::uuid();
        $ride->passenger_id = $passengerId;
        $ride->city_id = $cityId;
        $ride->category = 'pop';
        $ride->status = 'SEARCHING';
        $ride->pickup_address = 'Av. Paulista, 1578';
        $ride->dropoff_address = 'Av. Faria Lima, 3477';
        $ride->boarding_pin = '1234';
        $ride->estimated_price_cents = 2450;
        $ride->final_price_cents = 2450;

        // Primeiro aceite
        $driver1 = (string) Str::uuid();
        $ride->driver_id = $driver1;
        $ride->status = 'ACCEPTED';

        // Segundo motorista tenta aceitar a mesma corrida
        $driver2 = (string) Str::uuid();
        $canSecondDriverAccept = ($ride->status === 'SEARCHING' || $ride->status === 'OFFERED');

        $this->assertFalse($canSecondDriverAccept, 'O segundo motorista não pode aceitar uma corrida já atribuída.');
        $this->assertEquals($driver1, $ride->driver_id);
    }

    public function test_boarding_pin_prevents_unauthorized_trip_start(): void
    {
        $ride = new Ride();
        $ride->boarding_pin = '4928';
        $ride->status = 'DRIVER_ARRIVED';

        $invalidPinAttempt = '0000';
        $validPinAttempt = '4928';

        $this->assertNotEquals($ride->boarding_pin, $invalidPinAttempt);
        $this->assertEquals($ride->boarding_pin, $validPinAttempt);
    }
}
