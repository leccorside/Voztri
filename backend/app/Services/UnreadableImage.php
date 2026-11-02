<?php

namespace App\Services;

use RuntimeException;

/** A foto enviada não pôde ser aberta como JPEG ou PNG (arquivo corrompido ou disfarçado). */
class UnreadableImage extends RuntimeException {}
