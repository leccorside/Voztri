<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserDevice;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Registro dos aparelhos para notificações push (token do FCM; no iOS o FCM
 * repassa ao APNs).
 */
class DeviceController extends Controller
{
    /**
     * Registra (ou atualiza) o token do aparelho para o usuário logado. Um token
     * pertence a um único usuário: se outra conta entrar no mesmo aparelho, o
     * token passa para ela.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $v = $request->validate([
            'token' => 'required|string|max:4096',
            'platform' => 'required|string|in:android,ios',
            'deviceId' => 'nullable|string|max:100',
        ]);

        $device = DB::transaction(function () use ($user, $v) {
            $device = UserDevice::where('fcm_token', $v['token'])->lockForUpdate()->first() ?? new UserDevice();
            $device->fill([
                'user_id' => $user->id,
                'platform' => $v['platform'],
                'fcm_token' => $v['token'],
                'device_id' => $v['deviceId'] ?? $device->device_id,
                'last_active_at' => Carbon::now(),
            ]);
            $device->save();

            return $device;
        });

        return response()->json(['id' => $device->id, 'platform' => $device->platform], 201);
    }

    /** Remove o token (logout): o aparelho deixa de receber push desta conta. */
    public function destroy(Request $request)
    {
        $v = $request->validate(['token' => 'required|string|max:4096']);

        UserDevice::where('user_id', $request->user()->id)->where('fcm_token', $v['token'])->delete();

        return response()->noContent();
    }
}
