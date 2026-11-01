<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TrustedContact extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'passenger_id', 'name', 'phone', 'notify_on_trip'];
}
