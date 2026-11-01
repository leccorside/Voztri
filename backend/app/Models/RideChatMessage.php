<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class RideChatMessage extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'ride_id', 'sender_id', 'sender_role', 'message', 'read_at'];
    protected $casts = ['read_at' => 'datetime'];
}
