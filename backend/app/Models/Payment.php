<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'ride_id',
        'gateway',
        'gateway_transaction_id',
        'amount_cents',
        'platform_commission_cents',
        'driver_net_amount_cents',
        'status',
        'pix_qr_code',
        'pix_copy_paste',
        'raw_response',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'platform_commission_cents' => 'integer',
        'driver_net_amount_cents' => 'integer',
        'raw_response' => 'array',
    ];

    public function ride()
    {
        return $this->belongsTo(Ride::class);
    }
}

