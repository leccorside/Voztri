<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rides', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('passenger_id')->constrained('passengers')->cascadeOnDelete();
            $table->foreignUuid('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
            $table->foreignUuid('city_id')->constrained('cities')->cascadeOnDelete();
            $table->string('category', 20)->default('pop'); // pop, black, mulher, moto
            $table->string('status', 30)->default('REQUESTED'); 
            // REQUESTED, SEARCHING, OFFERED, ACCEPTED, DRIVER_EN_ROUTE, DRIVER_ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED, NO_DRIVER_AVAILABLE
            
            $table->text('pickup_address');
            $table->text('dropoff_address');
            $table->integer('distance_meters')->default(0);
            $table->integer('duration_seconds')->default(0);
            $table->string('boarding_pin', 4);
            $table->integer('estimated_price_cents')->default(0);
            $table->integer('final_price_cents')->default(0);
            $table->string('payment_method', 20)->default('pix'); // pix, credit_card, cash, wallet
            $table->string('payment_status', 20)->default('pending'); // pending, authorized, paid, failed, refunded
            $table->text('route_polyline')->nullable();
            
            $table->string('cancellation_reason')->nullable();
            $table->uuid('cancelled_by')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });

        // Adiciona colunas geométricas PostGIS para origem e destino
        DB::statement('ALTER TABLE rides ADD COLUMN pickup_location geometry(Point, 4326);');
        DB::statement('ALTER TABLE rides ADD COLUMN dropoff_location geometry(Point, 4326);');
        DB::statement('CREATE INDEX idx_rides_pickup_location ON rides USING GIST (pickup_location);');

        Schema::create('ride_offers', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('ride_id')->constrained('rides')->cascadeOnDelete();
            $table->foreignUuid('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->integer('radius_km')->default(2);
            $table->string('status', 20)->default('sent'); // sent, accepted, rejected, expired
            $table->timestamp('expires_at');
            $table->timestamps();
        });

        Schema::create('ride_status_history', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('ride_id')->constrained('rides')->cascadeOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->uuid('triggered_by')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('ride_chat_messages', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('ride_id')->constrained('rides')->cascadeOnDelete();
            $table->foreignUuid('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('sender_role', 20); // passenger, driver
            $table->text('message');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ride_chat_messages');
        Schema::dropIfExists('ride_status_history');
        Schema::dropIfExists('ride_offers');
        Schema::dropIfExists('rides');
    }
};

