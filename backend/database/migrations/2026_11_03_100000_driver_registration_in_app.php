<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cadastro do motorista pelo app (Fase 13): o motorista novo nasce com o status
     * `registering` e sem CNH (antes o login gravava a CNH fictícia 00000000000 e já o
     * aprovava). Os dados da CNH chegam pela etapa de cadastro, então passam a aceitar
     * null. Motoristas que já existem não mudam.
     */
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('cnh_number', 20)->nullable()->change();
            $table->date('cnh_expires_at')->nullable()->change();
            $table->boolean('cnh_has_ear')->default(false)->change();
            $table->string('status', 30)->default('registering')->change();
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('status', 30)->default('pending_approval')->change();
            $table->boolean('cnh_has_ear')->default(true)->change();
        });
    }
};
