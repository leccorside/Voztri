<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SavedPlace;
use Illuminate\Http\Request;

/**
 * Endereços salvos do passageiro: Casa e Trabalho (um de cada). O endereço vem da
 * busca do app (Photon), já no formato do app; aqui só é validado e guardado.
 */
class SavedPlaceController extends Controller
{
    /** { home: AddressLocation | null, work: AddressLocation | null } */
    public function index(Request $request)
    {
        $places = SavedPlace::where('user_id', $request->user()->id)->get()->keyBy('kind');

        return response()->json(self::payload($places->all()));
    }

    /** Cria ou troca o endereço do tipo; devolve todos os endereços salvos. */
    public function update(Request $request, string $kind)
    {
        $v = $request->validate([
            'address' => 'required|string|max:255',
            'shortAddress' => 'required|string|max:120',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:50',
        ]);

        SavedPlace::updateOrCreate(
            ['user_id' => $request->user()->id, 'kind' => $kind],
            [
                'address' => $v['address'],
                'short_address' => $v['shortAddress'],
                'latitude' => $v['latitude'],
                'longitude' => $v['longitude'],
                'city' => $v['city'] ?? null,
                'state' => $v['state'] ?? null,
            ],
        );

        return $this->index($request);
    }

    /** Remove o endereço do tipo (sem erro se não havia). */
    public function destroy(Request $request, string $kind)
    {
        SavedPlace::where('user_id', $request->user()->id)->where('kind', $kind)->delete();

        return response()->noContent();
    }

    /** @param array<string, SavedPlace> $byKind */
    private static function payload(array $byKind): array
    {
        $out = [];
        foreach (SavedPlace::KINDS as $kind) {
            $out[$kind] = isset($byKind[$kind]) ? $byKind[$kind]->toAddress() : null;
        }

        return $out;
    }
}
