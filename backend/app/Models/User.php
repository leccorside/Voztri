<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable, SoftDeletes;

    protected $fillable = [
        'id',
        'phone',
        'name',
        'email',
        'cpf',
        'avatar_url',
        'password_hash',
        'role',
        'status',
        'otp_code',
        'otp_expires_at',
    ];

    protected $hidden = [
        'password_hash',
        'otp_code',
        'otp_expires_at',
        // Chave interna no bucket: os apps usam o avatarUrl() (servido pela API)
        'avatar_path',
    ];

    /**
     * Endereço da foto do perfil para os apps. A foto enviada é servida pela API (exige
     * login), com caminho relativo: o app completa com o endereço da API que já usa
     * (emulador, celular por USB e produção enxergam hosts diferentes). `?v=` muda a
     * cada foto nova, para o cache do app não mostrar a antiga. Sem foto enviada, vale
     * o `avatar_url` externo (seed) ou null.
     */
    public function avatarUrl(): ?string
    {
        if ($this->avatar_path) {
            return '/api/v1/users/' . $this->id . '/avatar?v=' . substr(sha1($this->avatar_path), 0, 10);
        }

        return $this->avatar_url;
    }

    public function profile()
    {
        return $this->hasOne(UserProfile::class);
    }

    public function passenger()
    {
        return $this->hasOne(Passenger::class);
    }

    public function driver()
    {
        return $this->hasOne(Driver::class);
    }

    public function devices()
    {
        return $this->hasMany(UserDevice::class);
    }

    public function savedPlaces()
    {
        return $this->hasMany(SavedPlace::class);
    }

    public function recentDestinations()
    {
        return $this->hasMany(RecentDestination::class);
    }

    protected static function booted(): void
    {
        // A exclusão é lógica (SoftDeletes), então o cascade do banco não age: Casa,
        // Trabalho e os últimos destinos são dados sensíveis e não ficam guardados
        // para uma conta excluída
        static::deleted(function (User $user) {
            $user->savedPlaces()->delete();
            $user->recentDestinations()->delete();
            // A foto do perfil também sai do MinIO
            app(\App\Services\AvatarService::class)->purge($user);
        });
    }
}

