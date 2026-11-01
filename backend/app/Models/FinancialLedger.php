<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class FinancialLedger extends Model
{
    use HasUuids;

    public $timestamps = false;
    protected $table = 'financial_ledger';

    protected $fillable = [
        'id',
        'reference_id',
        'reference_type',
        'account_type',
        'account_id',
        'entry_type',
        'amount_cents',
        'balance_after_cents',
        'description',
        'created_at',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'balance_after_cents' => 'integer',
        'created_at' => 'datetime',
    ];
}

