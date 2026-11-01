<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class City extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'name', 'state', 'is_active'];

    public function serviceAreas()
    {
        return $this->hasMany(ServiceArea::class);
    }

    public function fareRules()
    {
        return $this->hasMany(FareRule::class);
    }
}

