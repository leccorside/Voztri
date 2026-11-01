<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class RideStatusHistory extends Model
{
    use HasUuids;

    protected $table = 'ride_status_history';

    public $timestamps = false;

    protected $fillable = ['id', 'ride_id', 'from_status', 'to_status', 'triggered_by', 'metadata', 'created_at'];
    protected $casts = ['metadata' => 'array', 'created_at' => 'datetime'];
}
