<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ServiceArea extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'city_id', 'name', 'is_active'];
}
