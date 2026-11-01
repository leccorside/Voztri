<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ride extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'passenger_id',
        'driver_id',
        'city_id',
        'category',
        'status',
        'pickup_address',
        'dropoff_address',
        'distance_meters',
        'duration_seconds',
        'boarding_pin',
        'estimated_price_cents',
        'final_price_cents',
        'payment_method',
        'payment_status',
        'route_polyline',
        'cancellation_reason',
        'cancelled_by',
        'started_at',
        'completed_at',
        'cancelled_at',
    ];

    protected $casts = [
        'distance_meters' => 'integer',
        'duration_seconds' => 'integer',
        'estimated_price_cents' => 'integer',
        'final_price_cents' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function passenger()
    {
        return $this->belongsTo(Passenger::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function offers()
    {
        return $this->hasMany(RideOffer::class);
    }

    public function chatMessages()
    {
        return $this->hasMany(RideChatMessage::class);
    }

    public function payment()
    {
        return $this->hasOne(Payment::class);
    }
}
