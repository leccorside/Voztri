<?php

namespace App\Support;

/** CPF: só dígitos, com os dois dígitos verificadores conferidos. */
final class Cpf
{
    public static function digits(?string $value): string
    {
        return preg_replace('/\D/', '', (string) $value);
    }

    public static function isValid(?string $value): bool
    {
        $cpf = self::digits($value);
        // Onze dígitos iguais (000.000.000-00, 111...) passam na conta e não valem
        if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
            return false;
        }

        for ($length = 9; $length <= 10; $length++) {
            $sum = 0;
            for ($i = 0; $i < $length; $i++) {
                $sum += (int) $cpf[$i] * ($length + 1 - $i);
            }
            $check = ($sum * 10) % 11 % 10;
            if ($check !== (int) $cpf[$length]) {
                return false;
            }
        }

        return true;
    }
}
