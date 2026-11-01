<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\RideChatMessage;

class NewChatMessageEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public RideChatMessage $message
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel("ride.chat.{$this->message->ride_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'NewChatMessage';
    }
}
