<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Endereços salvos do passageiro (Casa e Trabalho): no máximo um por tipo. São
     * dados pessoais sensíveis: só a própria conta lê e altera, e saem junto com o
     * usuário (cascade).
     */
    public function up(): void
    {
        Schema::create('saved_places', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 10); // home | work
            $table->string('address', 255);
            $table->string('short_address', 120);
            $table->string('city', 100)->nullable();
            $table->string('state', 50)->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->timestamps();

            $table->unique(['user_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_places');
    }
};
