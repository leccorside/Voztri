<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class UserDevice extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'user_id', 'platform', 'fcm_token', 'device_id', 'last_active_at'];

    protected $casts = ['last_active_at' => 'datetime'];
}
