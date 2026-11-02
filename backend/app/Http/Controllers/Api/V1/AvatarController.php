<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Models\User;
use App\Services\AvatarService;
use App\Services\UnreadableImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Foto do perfil (passageiro e motorista), guardada no MinIO e servida pela API: o
 * bucket não é público, e a foto só é mostrada a quem tem motivo para vê-la.
 */
class AvatarController extends Controller
{
    /** Tamanho máximo do arquivo enviado (KB). O app reduz a foto antes de enviar. */
    public const MAX_KB = 2048;

    public function __construct(private AvatarService $avatars) {}

    /** Envia ou troca a foto. Multipart, campo `photo` (JPEG ou PNG). */
    public function store(Request $request)
    {
        $request->validate([
            // Limite de dimensões contra imagens enormes que estouram a memória ao abrir
            'photo' => 'required|file|mimes:jpeg,jpg,png|max:' . self::MAX_KB
                . '|dimensions:min_width=128,min_height=128,max_width=8000,max_height=8000',
        ], [
            'photo.required' => 'Escolha uma foto.',
            'photo.file' => 'Escolha uma foto.',
            'photo.mimes' => 'A foto precisa ser JPEG ou PNG.',
            'photo.max' => 'A foto pode ter no máximo 2 MB.',
            'photo.dimensions' => 'A foto precisa ter pelo menos 128 × 128 pixels.',
        ]);

        $user = $request->user();
        try {
            $this->avatars->store($user, $request->file('photo'));
        } catch (UnreadableImage $e) {
            return response()->json(['message' => 'Não foi possível usar esta foto. Tente outra.', 'error' => 'INVALID_PHOTO'], 422);
        } catch (\Throwable $e) {
            // Falha ao guardar no MinIO: não é culpa da foto
            report($e);

            return response()->json([
                'message' => 'Não foi possível guardar a foto agora. Tente de novo em instantes.',
                'error' => 'STORAGE_UNAVAILABLE',
            ], 503);
        }

        return response()->json(['avatarUrl' => $user->fresh()->avatarUrl()]);
    }

    /** Tira a foto do perfil (sem erro se não havia). */
    public function destroy(Request $request)
    {
        $this->avatars->remove($request->user());

        return response()->json(['avatarUrl' => $request->user()->fresh()->avatarUrl()]);
    }

    /**
     * A foto de um usuário: para ele mesmo, um administrador ou quem divide (ou dividiu)
     * uma corrida com ele (passageiro e motorista da mesma corrida).
     */
    public function show(Request $request, string $id)
    {
        $viewer = $request->user();
        $owner = User::find($id);
        if (!$owner || !$owner->avatar_path) {
            return response()->json(['message' => 'Foto não encontrada.', 'error' => 'NOT_FOUND'], 404);
        }
        if (!$this->canSee($viewer, $owner)) {
            return response()->json(['message' => 'Você não tem acesso a esta foto.', 'error' => 'FORBIDDEN'], 403);
        }

        $disk = Storage::disk(AvatarService::DISK);
        if (!$disk->exists($owner->avatar_path)) {
            return response()->json(['message' => 'Foto não encontrada.', 'error' => 'NOT_FOUND'], 404);
        }

        // O endereço muda a cada foto (?v=), então o app pode guardar em cache
        return response($disk->get($owner->avatar_path), 200, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    private function canSee(User $viewer, User $owner): bool
    {
        if ($viewer->id === $owner->id || $viewer->role === 'admin') {
            return true;
        }

        return $this->sharedRide($viewer, $owner) || $this->sharedRide($owner, $viewer);
    }

    /** Alguma corrida com $passenger como passageiro e $driver como motorista. */
    private function sharedRide(User $passenger, User $driver): bool
    {
        return Ride::whereHas('passenger', fn ($q) => $q->where('user_id', $passenger->id))
            ->whereHas('driver', fn ($q) => $q->where('user_id', $driver->id))
            ->exists();
    }
}
