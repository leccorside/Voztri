<?php

namespace App\Infrastructure\Geo;

/**
 * Busca de endereços e lugares pelo texto (destino do passageiro), perto de um ponto.
 */
interface AddressSearch
{
    /**
     * @return array<int, array{address: string, shortAddress: string, city: ?string, state: ?string, latitude: float, longitude: float}>
     *         lista vazia quando nada foi encontrado
     *
     * @throws GeocodingUnavailable quando o provedor não responde ou responde com erro
     */
    public function search(string $query, float $nearLatitude, float $nearLongitude, int $limit = 6): array;
}
