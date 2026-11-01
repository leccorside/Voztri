<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class RideOffer extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'ride_id', 'driver_id', 'radius_km', 'status', 'expires_at'];
    protected $casts = ['expires_at' => 'datetime'];
}
