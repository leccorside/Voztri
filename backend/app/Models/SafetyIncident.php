<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SafetyIncident extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'ride_id', 'reported_by', 'type', 'latitude', 'longitude', 'status', 'notes', 'resolved_at'];
    protected $casts = ['latitude' => 'float', 'longitude' => 'float', 'resolved_at' => 'datetime'];
}
