<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Foto do perfil enviada pelo app, guardada no MinIO (disco s3). `avatar_path` é a
     * chave do arquivo no bucket; a foto é servida pela API (GET /users/{id}/avatar),
     * nunca por um link público do bucket. O `avatar_url` antigo continua para fotos
     * externas (seed).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_path', 255)->nullable()->after('avatar_url');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('avatar_path');
        });
    }
};
