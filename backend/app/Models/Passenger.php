<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class Passenger extends Model
{
    use HasUuids;

    /** PIN de emergência: quatro dígitos. */
    public const EMERGENCY_PIN_PATTERN = '/^\d{4}$/';

    protected $fillable = [
        'id',
        'user_id',
        'emergency_pin',
    ];

    // O PIN desativa o SOS: guardado com hash e nunca devolvido pela API
    protected $hidden = ['emergency_pin'];

    protected $casts = ['emergency_pin' => 'hashed'];

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

    public function hasEmergencyPin(): bool
    {
        return !empty($this->emergency_pin);
    }

    public function checkEmergencyPin(string $pin): bool
    {
        return $this->hasEmergencyPin() && Hash::check($pin, $this->emergency_pin);
    }

    /**
     * PIN fácil de adivinhar por quem está com o passageiro: todos os dígitos iguais
     * (0000, 7777) ou sequência crescente/decrescente (1234, 6789, 4321, 9876).
     */
    public static function isWeakEmergencyPin(string $pin): bool
    {
        $digits = array_map('intval', str_split($pin));
        if (count(array_unique($digits)) === 1) {
            return true;
        }

        $steps = [];
        for ($i = 1; $i < count($digits); $i++) {
            $steps[] = $digits[$i] - $digits[$i - 1];
        }
        $steps = array_unique($steps);

        return count($steps) === 1 && in_array(reset($steps), [1, -1], true);
    }
}
