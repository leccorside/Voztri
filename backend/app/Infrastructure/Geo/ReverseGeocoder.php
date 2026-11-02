<?php

namespace App\Infrastructure\Geo;

/**
 * Converte uma coordenada em endereço (geocodificação reversa).
 */
interface ReverseGeocoder
{
    /**
     * @return array{address: string, shortAddress: string, city: ?string, state: ?string}|null
     *         null quando não há endereço para a coordenada
     *
     * @throws GeocodingUnavailable quando o provedor não responde ou responde com erro
     */
    public function reverse(float $latitude, float $longitude): ?array;
}
