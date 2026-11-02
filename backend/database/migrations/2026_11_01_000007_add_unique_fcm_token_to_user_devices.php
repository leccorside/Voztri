<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Um token do FCM identifica um único aparelho: evita registros duplicados
     * (e pushes repetidos) quando o app registra o mesmo token mais de uma vez.
     */
    public function up(): void
    {
        DB::statement('CREATE UNIQUE INDEX user_devices_fcm_token_unique ON user_devices (fcm_token) WHERE fcm_token IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS user_devices_fcm_token_unique');
    }
};
