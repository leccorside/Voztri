<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/** Destino de uma corrida solicitada pelo passageiro (histórico da busca). */
class RecentDestination extends Model
{
    use HasUuids;

    /** Quantos destinos ficam guardados por conta (os mais antigos saem). */
    public const LIMIT = 5;

    /** Destinos a menos disso de um já guardado contam como o mesmo lugar. */
    public const SAME_PLACE_METERS = 50;

    /** Prazo de retenção: destinos sem uso há mais que isso são apagados (PruneRecentDestinations). */
    public const RETENTION_DAYS = 90;

    protected $fillable = ['user_id', 'address', 'short_address', 'city', 'state', 'latitude', 'longitude', 'used_at'];

    protected $casts = ['latitude' => 'float', 'longitude' => 'float', 'used_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Grava o destino como o mais recente. O mesmo lugar (endereço igual ou a menos
     * de 50 m) só sobe para o topo, com o nome mais novo; acima do limite, os mais
     * antigos são apagados.
     *
     * @param  array{address: string, shortAddress?: ?string, latitude: float|string, longitude: float|string, city?: ?string, state?: ?string}  $d
     */
    public static function record(User $user, array $d): void
    {
        $lat = (float) $d['latitude'];
        $lng = (float) $d['longitude'];
        $address = mb_substr(trim($d['address']), 0, 255);
        // Sem o título (cliente antigo), usa a parte do endereço antes do bairro
        $short = trim((string) ($d['shortAddress'] ?? '')) ?: Str::before($address, ' - ');

        $attrs = [
            'address' => $address,
            'short_address' => mb_substr($short, 0, 120),
            'city' => $d['city'] ?? null,
            'state' => $d['state'] ?? null,
            'latitude' => $lat,
            'longitude' => $lng,
            'used_at' => now(),
        ];

        $same = static::where('user_id', $user->id)->get()->first(
            fn (self $r) => mb_strtolower($r->address) === mb_strtolower($address)
                || self::meters($r->latitude, $r->longitude, $lat, $lng) < self::SAME_PLACE_METERS
        );
        $same ? $same->update($attrs) : static::create(['user_id' => $user->id] + $attrs);

        $keep = static::where('user_id', $user->id)->orderByDesc('used_at')->limit(self::LIMIT)->pluck('id');
        static::where('user_id', $user->id)->whereNotIn('id', $keep)->delete();
    }

    /** Ainda dentro do prazo de retenção (contado do último uso). */
    public function scopeWithinRetention(Builder $query): Builder
    {
        return $query->where('used_at', '>=', now()->subDays(self::RETENTION_DAYS));
    }

    /** Fora do prazo de retenção: o job agendado apaga. */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('used_at', '<', now()->subDays(self::RETENTION_DAYS));
    }

    /** Formato do app (AddressLocation) com o id, para remover do histórico. */
    public function toAddress(): array
    {
        return ['id' => $this->id] + array_filter([
            'address' => $this->address,
            'shortAddress' => $this->short_address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'city' => $this->city,
            'state' => $this->state,
        ], fn ($v) => $v !== null);
    }

    /** Distância em metros (haversine). */
    private static function meters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * $r * asin(min(1, sqrt($a)));
    }
}
