<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = false;
    use HasUuids;

    protected $fillable = ['id', 'user_id', 'action', 'target_entity', 'target_id', 'ip_address', 'old_values', 'new_values', 'created_at'];
    protected $casts = ['old_values' => 'array', 'new_values' => 'array', 'created_at' => 'datetime'];
}
