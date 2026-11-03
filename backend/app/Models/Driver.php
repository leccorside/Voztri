<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Driver extends Model
{
    use HasUuids;

    /** Cadastro pelo app ainda incompleto (dados pessoais, CNH, veículo, documentos). */
    public const STATUS_REGISTERING = 'registering';

    /** Cadastro enviado, esperando a análise no painel. */
    public const STATUS_PENDING = 'pending_approval';

    public const STATUS_APPROVED = 'approved';

    /** Categorias da CNH aceitas; a etapa do veículo confere se a categoria permite o carro ou a moto. */
    public const CNH_CATEGORIES = ['A', 'B', 'AB', 'C', 'AC', 'D', 'AD', 'E', 'AE'];

    /** A categoria da CNH permite dirigir moto (tem o A)? */
    public static function cnhAllowsMotorcycle(?string $category): bool
    {
        return $category !== null && str_contains($category, 'A');
    }

    /** A categoria da CNH permite dirigir carro (B, C, D ou E: as de cima incluem a B)? */
    public static function cnhAllowsCar(?string $category): bool
    {
        return $category !== null && (bool) preg_match('/[BCDE]/', $category);
    }

    /**
     * Mensagem quando a categoria da CNH não permite a categoria do veículo (moto: A;
     * pop/black/mulher: B ou acima); null se permite.
     */
    public static function vehicleIncompatibility(?string $cnhCategory, string $vehicleCategory): ?string
    {
        if ($vehicleCategory === 'moto' && !self::cnhAllowsMotorcycle($cnhCategory)) {
            return "Sua CNH (categoria {$cnhCategory}) não permite dirigir moto. Para a Moto, a CNH precisa ter a categoria A (A, AB, AC, AD ou AE).";
        }
        if ($vehicleCategory !== 'moto' && !self::cnhAllowsCar($cnhCategory)) {
            return "Sua CNH (categoria {$cnhCategory}) não permite dirigir carro. Para Pop ou Black, a CNH precisa ter a categoria B ou acima.";
        }

        return null;
    }

    protected $fillable = [
        'id',
        'user_id',
        'cnh_number',
        'cnh_category',
        'cnh_expires_at',
        'cnh_has_ear',
        'status',
        'is_online',
        'current_latitude',
        'current_longitude',
        'last_location_at',
        'pix_key',
        'pix_key_type',
    ];

    protected $casts = [
        'cnh_has_ear' => 'boolean',
        'cnh_expires_at' => 'date',
        'is_online' => 'boolean',
        'current_latitude' => 'float',
        'current_longitude' => 'float',
        'last_location_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function documents()
    {
        return $this->hasMany(DriverDocument::class);
    }

    public function vehicles()
    {
        return $this->hasMany(DriverVehicle::class);
    }

    public function activeVehicle()
    {
        return $this->hasOne(DriverVehicle::class)->where('is_active', true);
    }

    public function rides()
    {
        return $this->hasMany(Ride::class);
    }
}

