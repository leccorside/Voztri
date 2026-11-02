<?php

namespace App\Infrastructure\Push;

use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Usado enquanto FCM_CREDENTIALS não aponta para a chave da conta de serviço
 * do Firebase: não envia nada, só registra no log.
 */
class NullPushNotifier implements PushNotifier
{
    public function sendToUser(User $user, PushMessage $message): int
    {
        Log::info('Push desligado (FCM_CREDENTIALS ausente); mensagem não enviada.', [
            'user_id' => $user->id,
            'title' => $message->title,
        ]);

        return 0;
    }

    public function isEnabled(): bool
    {
        return false;
    }
}
