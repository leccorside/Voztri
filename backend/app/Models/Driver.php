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

