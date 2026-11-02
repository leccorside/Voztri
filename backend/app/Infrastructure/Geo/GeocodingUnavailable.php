<?php

namespace App\Infrastructure\Geo;

use RuntimeException;

/** O provedor de geocodificação não respondeu (rede, tempo esgotado ou erro HTTP). */
class GeocodingUnavailable extends RuntimeException
{
}
