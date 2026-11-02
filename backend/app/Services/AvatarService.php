<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter;

/**
 * Foto do perfil: recorta em quadrado, reduz a 512 px e grava de novo em JPEG antes
 * de guardar no MinIO. Gravar de novo descarta os metadados EXIF, inclusive a
 * localização GPS de onde a foto foi tirada (que poderia expor a casa da pessoa); a
 * orientação do EXIF é aplicada antes, para a foto não ficar deitada.
 */
class AvatarService
{
    public const SIZE = 512;

    public const QUALITY = 85;

    /** Disco do MinIO (S3) e pasta das fotos no bucket. */
    public const DISK = 's3';

    private const DIRECTORY = 'avatars';

    /** Guarda a foto nova, apaga a anterior e devolve a chave no bucket. */
    public function store(User $user, UploadedFile $photo): string
    {
        $jpeg = $this->normalize($photo->getRealPath());

        $this->ensureBucket();
        $path = self::DIRECTORY . '/' . $user->id . '/' . Str::random(24) . '.jpg';
        // Pelo Flysystem direto: uma falha lança a exceção com a causa (o put() do
        // Laravel devolve só false com o 'throw' desligado)
        Storage::disk(self::DISK)->getDriver()->write($path, $jpeg, ['visibility' => 'private', 'ContentType' => 'image/jpeg']);

        $old = $user->avatar_path;
        $user->forceFill(['avatar_path' => $path])->save();
        if ($old && $old !== $path) {
            $this->deleteFile($old);
        }

        return $path;
    }

    /** Tira a foto do perfil (sem erro se não havia). */
    public function remove(User $user): void
    {
        $old = $user->avatar_path;
        $user->forceFill(['avatar_path' => null])->save();
        if ($old) {
            $this->deleteFile($old);
        }
    }

    /** Apaga todas as fotos da conta (exclusão da conta). */
    public function purge(User $user): void
    {
        try {
            Storage::disk(self::DISK)->deleteDirectory(self::DIRECTORY . '/' . $user->id);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * JPEG quadrado de 512 px a partir da foto enviada (JPEG ou PNG): orientação do
     * EXIF aplicada, recorte central, fundo branco no lugar da transparência.
     */
    public function normalize(string $file): string
    {
        $info = @getimagesize($file);
        $source = match ($info[2] ?? null) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($file),
            IMAGETYPE_PNG => @imagecreatefrompng($file),
            default => false,
        };
        if (!$source) {
            throw new UnreadableImage('Formato de imagem não suportado.');
        }

        if (($info[2] ?? null) === IMAGETYPE_JPEG) {
            $source = $this->applyExifOrientation($source, $file);
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $side = min($width, $height);
        $target = imagecreatetruecolor(self::SIZE, self::SIZE);
        imagefill($target, 0, 0, imagecolorallocate($target, 255, 255, 255));
        imagecopyresampled(
            $target,
            $source,
            0,
            0,
            intdiv($width - $side, 2),
            intdiv($height - $side, 2),
            self::SIZE,
            self::SIZE,
            $side,
            $side,
        );

        ob_start();
        imagejpeg($target, null, self::QUALITY);
        $jpeg = (string) ob_get_clean();
        imagedestroy($source);
        imagedestroy($target);

        return $jpeg;
    }

    /** Gira ou espelha conforme a tag Orientation (1 a 8) do EXIF. */
    private function applyExifOrientation(\GdImage $image, string $file): \GdImage
    {
        if (!function_exists('exif_read_data')) {
            return $image;
        }
        $orientation = (int) (@exif_read_data($file)['Orientation'] ?? 1);

        $rotated = match ($orientation) {
            3, 4 => imagerotate($image, 180, 0),
            5, 6 => imagerotate($image, -90, 0),
            7, 8 => imagerotate($image, 90, 0),
            default => $image,
        };
        if (in_array($orientation, [2, 4, 5, 7], true)) {
            imageflip($rotated, IMG_FLIP_HORIZONTAL);
        }

        return $rotated ?: $image;
    }

    private function deleteFile(string $path): void
    {
        try {
            Storage::disk(self::DISK)->delete($path);
        } catch (\Throwable $e) {
            // A foto nova já está no lugar: um arquivo antigo esquecido não pode falhar o pedido
            report($e);
        }
    }

    /** Cria o bucket do MinIO na primeira foto, se ainda não existir. */
    private function ensureBucket(): void
    {
        $adapter = Storage::disk(self::DISK)->getAdapter();
        if (!$adapter instanceof AwsS3V3Adapter) {
            return; // Storage::fake nos testes
        }

        $client = Storage::disk(self::DISK)->getClient();
        $bucket = config('filesystems.disks.' . self::DISK . '.bucket');
        if (!$client->doesBucketExistV2($bucket)) {
            $client->createBucket(['Bucket' => $bucket]);
            Log::info('Bucket criado no MinIO.', ['bucket' => $bucket]);
        }
    }
}
