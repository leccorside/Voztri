<?php

namespace App\Infrastructure\Push;

use App\Models\User;

interface PushNotifier
{
    /**
     * Envia a mensagem para todos os aparelhos registrados do usuário.
     *
     * @return int Quantidade de aparelhos que aceitaram a mensagem.
     */
    public function sendToUser(User $user, PushMessage $message): int;

    /** O envio real está configurado (credenciais presentes)? */
    public function isEnabled(): bool;
}
