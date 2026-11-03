<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DriverVehicle extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'driver_id', 'brand', 'model', 'year', 'color', 'plate', 'renavam', 'category', 'is_active'];

    protected $casts = ['year' => 'integer', 'is_active' => 'boolean'];

    /**
     * Categorias que o motorista escolhe no cadastro pelo app. "mulher" fica de fora:
     * é exclusiva de motoristas mulheres e o cadastro não coleta gênero; a equipe
     * define na análise.
     */
    public const SELF_SERVICE_CATEGORIES = ['pop', 'black', 'moto'];

    /** Ano mais antigo aceito: carro/moto com até 15 anos; Black, até 8. */
    public const MAX_AGE_YEARS = 15;

    public const BLACK_MAX_AGE_YEARS = 8;

    public function isMotorcycle(): bool
    {
        return $this->category === 'moto';
    }

    /** Placa só com letras e números, em maiúsculas: ABC1234 (antiga) ou ABC1D23 (Mercosul). */
    public static function normalizePlate(?string $plate): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $plate));
    }
}
