<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'user_id', 'birth_date', 'gender', 'rating_avg', 'total_ratings'];
}

class UserDevice extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'user_id', 'platform', 'fcm_token', 'device_id', 'last_active_at'];
}

class TrustedContact extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'passenger_id', 'name', 'phone', 'notify_on_trip'];
}

class DriverDocument extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'driver_id', 'type', 'document_url', 'status', 'rejection_reason'];
}

class DriverVehicle extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'driver_id', 'brand', 'model', 'year', 'color', 'plate', 'renavam', 'category', 'is_active'];
}

class ServiceArea extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'city_id', 'name', 'is_active'];
}

class RideOffer extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'ride_id', 'driver_id', 'radius_km', 'status', 'expires_at'];
    protected $casts = ['expires_at' => 'datetime'];
}

class RideChatMessage extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'ride_id', 'sender_id', 'sender_role', 'message', 'read_at'];
    protected $casts = ['read_at' => 'datetime'];
}

class SafetyIncident extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'ride_id', 'reported_by', 'type', 'latitude', 'longitude', 'status', 'notes', 'resolved_at'];
    protected $casts = ['latitude' => 'float', 'longitude' => 'float', 'resolved_at' => 'datetime'];
}

class AuditLog extends Model
{
    public $timestamps = false;
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['id', 'user_id', 'action', 'target_entity', 'target_id', 'ip_address', 'old_values', 'new_values', 'created_at'];
    protected $casts = ['old_values' => 'array', 'new_values' => 'array', 'created_at' => 'datetime'];
}
