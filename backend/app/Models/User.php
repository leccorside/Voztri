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
    ];

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
}

