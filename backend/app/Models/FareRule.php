<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class FareRule extends Model
{
    use HasUuids;

    protected $fillable = [
        'id',
        'city_id',
        'vehicle_category',
        'base_fare_cents',
        'price_per_km_cents',
        'price_per_minute_cents',
        'minimum_fare_cents',
        'platform_commission_percent',
    ];

    public function city()
    {
        return $this->belongsTo(City::class);
    }
}

