<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DriverVehicle extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'driver_id', 'brand', 'model', 'year', 'color', 'plate', 'renavam', 'category', 'is_active'];
}
