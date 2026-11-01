<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\SafetyIncident;

class EmergencySosTriggeredEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public SafetyIncident $incident
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('admin.operations'),
            new Channel("ride.sos.{$this->incident->ride_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'EmergencySosTriggered';
    }
}

