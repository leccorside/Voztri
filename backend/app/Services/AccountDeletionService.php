<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\Passenger;
use App\Models\Ride;
use App\Models\RideChatMessage;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;

/**
 * Exclusão da conta pelo próprio usuário (exigida pela Google Play e pela App Store).
 *
 * Apaga o que é pessoal e não tem motivo para ficar: telefone, nome, e-mail, CPF,
 * foto, Casa/Trabalho, destinos recentes, contatos de confiança, PIN de emergência,
 * chave Pix, CNH, documentos, aparelhos (push), mensagens do chat e as sessões.
 *
 * Mantém, sem dado que identifique a pessoa, o que outra lei ou a outra parte precisa:
 * as corridas, o ledger e os pagamentos (registro fiscal e contábil), as avaliações e
 * as ocorrências de segurança. O registro em `users` fica com exclusão lógica e o nome
 * "Conta excluída", para o histórico do motorista ou do passageiro da mesma corrida
 * continuar fechando.
 */
class AccountDeletionService
{
    public const DELETED_NAME = 'Conta excluída';

    /** Status de corrida em que a conta não pode sumir (a outra parte depende dela). */
    public const OPEN_RIDE_STATUSES = ['REQUESTED', 'SEARCHING', 'OFFERED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'];

    /** Há corrida em aberto como passageiro ou como motorista? */
    public function hasOpenRide(User $user): bool
    {
        return Ride::whereIn('status', self::OPEN_RIDE_STATUSES)
            ->where(function ($q) use ($user) {
                $q->whereHas('passenger', fn ($p) => $p->where('user_id', $user->id))
                    ->orWhereHas('driver', fn ($d) => $d->where('user_id', $user->id));
            })
            ->exists();
    }

    public function delete(User $user, ?string $ip = null): void
    {
        DB::transaction(function () use ($user, $ip) {
            $user->tokens()->delete();
            $user->devices()->delete();

            RideChatMessage::where('sender_id', $user->id)->delete();
            UserProfile::where('user_id', $user->id)->update(['birth_date' => null, 'gender' => null]);

            if ($passenger = Passenger::where('user_id', $user->id)->first()) {
                $passenger->trustedContacts()->delete();
                $passenger->forceFill(['emergency_pin' => null])->save();
            }

            if ($driver = Driver::where('user_id', $user->id)->first()) {
                $driver->documents()->delete();
                $driver->forceFill([
                    'status' => 'deleted',
                    'is_online' => false,
                    'current_latitude' => null,
                    'current_longitude' => null,
                    'last_location_at' => null,
                    'pix_key' => null,
                    'pix_key_type' => null,
                    'cnh_number' => null,
                    'cnh_expires_at' => null,
                ])->save();
            }

            // O telefone é único e o login cria a conta pelo telefone: um valor que não
            // é telefone libera o número para uma conta nova no futuro
            $user->forceFill([
                'name' => self::DELETED_NAME,
                'phone' => 'deleted-' . substr(str_replace('-', '', $user->id), 0, 12),
                'email' => null,
                'cpf' => null,
                'avatar_url' => null,
                'avatar_path' => null,
                'password_hash' => null,
                'otp_code' => null,
                'otp_expires_at' => null,
                'status' => 'deleted',
            ])->save();

            // Sem telefone nem nome: só fica o fato de que a conta foi excluída
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'account_deleted',
                'target_entity' => 'users',
                'target_id' => $user->id,
                'ip_address' => $ip,
                'new_values' => ['role' => $user->role],
            ]);

            // Exclusão lógica: o evento `deleted` do User apaga Casa/Trabalho, destinos
            // recentes e a pasta da foto no MinIO (uma falha no MinIO só é registrada)
            $user->delete();
        });
    }
}
