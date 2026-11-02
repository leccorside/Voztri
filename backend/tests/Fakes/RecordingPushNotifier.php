<?php

namespace Tests\Fakes;

use App\Infrastructure\Push\PushMessage;
use App\Infrastructure\Push\PushNotifier;
use App\Models\User;

/** Grava as mensagens em vez de enviar (testes). */
class RecordingPushNotifier implements PushNotifier
{
    /** @var array<int, array{user: User, message: PushMessage}> */
    public array $sent = [];

    public function sendToUser(User $user, PushMessage $message): int
    {
        $this->sent[] = ['user' => $user, 'message' => $message];

        return 1;
    }

    public function isEnabled(): bool
    {
        return true;
    }

    /** @return array<int, PushMessage> */
    public function messagesFor(User $user): array
    {
        return array_values(array_map(
            fn ($s) => $s['message'],
            array_filter($this->sent, fn ($s) => $s['user']->id === $user->id),
        ));
    }
}
