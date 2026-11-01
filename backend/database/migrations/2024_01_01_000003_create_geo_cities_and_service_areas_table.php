<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cities', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->string('name', 100);
            $table->string('state', 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Adiciona coluna geométrica para o centro da cidade
        DB::statement('ALTER TABLE cities ADD COLUMN center_point geometry(Point, 4326);');

        Schema::create('service_areas', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('city_id')->constrained('cities')->cascadeOnDelete();
            $table->string('name', 100);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Adiciona coluna geométrica para o polígono de atendimento
        DB::statement('ALTER TABLE service_areas ADD COLUMN polygon geometry(Polygon, 4326);');
        DB::statement('CREATE INDEX idx_service_areas_polygon ON service_areas USING GIST (polygon);');

        Schema::create('fare_rules', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('city_id')->constrained('cities')->cascadeOnDelete();
            $table->string('vehicle_category', 20); // pop, black, mulher, moto
            $table->integer('base_fare_cents')->default(500); // R$ 5,00
            $table->integer('price_per_km_cents')->default(220); // R$ 2,20
            $table->integer('price_per_minute_cents')->default(35); // R$ 0,35
            $table->integer('minimum_fare_cents')->default(750); // R$ 7,50
            $table->decimal('platform_commission_percent', 5, 2)->default(15.00); // 15%
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fare_rules');
        Schema::dropIfExists('service_areas');
        Schema::dropIfExists('cities');
    }
};

