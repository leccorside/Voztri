<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Driver extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'user_id',
        'cnh_number',
        'cnh_category',
        'cnh_expires_at',
        'cnh_has_ear',
        'status',
        'is_online',
        'current_latitude',
        'current_longitude',
        'last_location_at',
        'pix_key',
        'pix_key_type',
    ];

    protected $casts = [
        'cnh_has_ear' => 'boolean',
        'is_online' => 'boolean',
        'current_latitude' => 'float',
        'current_longitude' => 'float',
        'last_location_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function documents()
    {
        return $this->hasMany(DriverDocument::class);
    }

    public function vehicles()
    {
        return $this->hasMany(DriverVehicle::class);
    }

    public function activeVehicle()
    {
        return $this->hasOne(DriverVehicle::class)->where('is_active', true);
    }

    public function rides()
    {
        return $this->hasMany(Ride::class);
    }
}
