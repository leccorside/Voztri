<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Endereço salvo do passageiro (Casa ou Trabalho). */
class SavedPlace extends Model
{
    use HasUuids;

    public const KINDS = ['home', 'work'];

    protected $fillable = ['user_id', 'kind', 'address', 'short_address', 'city', 'state', 'latitude', 'longitude'];

    protected $casts = ['latitude' => 'float', 'longitude' => 'float'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Formato do app (AddressLocation). */
    public function toAddress(): array
    {
        return array_filter([
            'address' => $this->address,
            'shortAddress' => $this->short_address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'city' => $this->city,
            'state' => $this->state,
        ], fn ($v) => $v !== null);
    }
}
