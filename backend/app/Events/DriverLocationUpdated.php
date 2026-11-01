<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DriverLocationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $driverId,
        public float $latitude,
        public float $longitude,
        public float $heading = 0,
        public float $speed = 0
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel("driver.location.{$this->driverId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'DriverLocationUpdated';
    }
}
