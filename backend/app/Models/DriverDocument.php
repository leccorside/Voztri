<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DriverDocument extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'driver_id', 'type', 'document_url', 'status', 'rejection_reason'];
}
