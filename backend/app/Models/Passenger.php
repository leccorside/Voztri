<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Passenger extends Model
{
    use HasUuids;

    protected $fillable = [
        'id',
        'user_id',
        'emergency_pin',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function trustedContacts()
    {
        return $this->hasMany(TrustedContact::class);
    }

    public function rides()
    {
        return $this->hasMany(Ride::class);
    }
}

