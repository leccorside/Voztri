<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PIN de emergência definido pelo passageiro, guardado com hash.
     *
     * Antes, todo passageiro nascia com '1234' em texto puro (coluna string(6) com
     * esse padrão). Os PINs existentes são apagados, e não convertidos em hash: eram
     * o padrão conhecido por todos, não uma escolha do passageiro. Sem PIN (null), o
     * app pede para definir um antes da próxima corrida.
     */
    public function up(): void
    {
        Schema::table('passengers', function (Blueprint $table) {
            $table->string('emergency_pin', 255)->nullable()->default(null)->change();
        });

        DB::table('passengers')->update(['emergency_pin' => null]);
    }

    public function down(): void
    {
        DB::table('passengers')->update(['emergency_pin' => '1234']);

        Schema::table('passengers', function (Blueprint $table) {
            $table->string('emergency_pin', 6)->nullable(false)->default('1234')->change();
        });
    }
};
