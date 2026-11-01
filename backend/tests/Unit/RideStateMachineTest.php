<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Domain\Ride\Services\RideStateMachine;
use App\Models\Ride;
use Exception;

class RideStateMachineTest extends TestCase
{
    public function test_valid_transitions_are_allowed(): void
    {
        $stateMachine = new RideStateMachine();
        $reflection = new \ReflectionClass(RideStateMachine::class);
        $transitions = $reflection->getConstant('ALLOWED_TRANSITIONS');

        $this->assertContains('SEARCHING', $transitions['REQUESTED']);
        $this->assertContains('ACCEPTED', $transitions['OFFERED']);
        $this->assertContains('IN_PROGRESS', $transitions['DRIVER_ARRIVED']);
        $this->assertContains('COMPLETED', $transitions['IN_PROGRESS']);
    }

    public function test_terminal_states_have_no_further_transitions(): void
    {
        $reflection = new \ReflectionClass(RideStateMachine::class);
        $transitions = $reflection->getConstant('ALLOWED_TRANSITIONS');

        $this->assertEmpty($transitions['COMPLETED']);
        $this->assertEmpty($transitions['CANCELLED']);
    }
}

