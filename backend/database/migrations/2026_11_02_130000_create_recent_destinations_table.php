<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Últimos destinos do passageiro, gravados pela API a cada corrida solicitada
     * (sem repetidos; só os mais recentes ficam guardados). Dados pessoais
     * sensíveis: só a própria conta lê e remove, e saem junto com o usuário.
     */
    public function up(): void
    {
        Schema::create('recent_destinations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('address', 255);
            $table->string('short_address', 120);
            $table->string('city', 100)->nullable();
            $table->string('state', 50)->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            // Ordem do histórico (atualizado quando o mesmo destino é usado de novo)
            $table->timestamp('used_at');
            $table->timestamps();

            $table->index(['user_id', 'used_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recent_destinations');
    }
};
