<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('passengers', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('emergency_pin', 6)->default('1234');
            $table->timestamps();
        });

        Schema::create('trusted_contacts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('passenger_id')->constrained('passengers')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('phone', 20);
            $table->boolean('notify_on_trip')->default(true);
            $table->timestamps();
        });

        Schema::create('drivers', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('cnh_number', 20);
            $table->string('cnh_category', 5)->default('B');
            $table->date('cnh_expires_at');
            $table->boolean('cnh_has_ear')->default(true); // Exerce Atividade Remunerada (Lei 13.640)
            $table->string('status', 30)->default('pending_approval'); // pending_approval, approved, rejected, blocked
            $table->boolean('is_online')->default(false);
            $table->decimal('current_latitude', 10, 7)->nullable();
            $table->decimal('current_longitude', 10, 7)->nullable();
            $table->timestamp('last_location_at')->nullable();
            $table->string('pix_key')->nullable();
            $table->string('pix_key_type', 20)->nullable();
            $table->timestamps();
        });

        Schema::create('driver_documents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->string('type', 30); // cnh, crlv, background_check, photo
            $table->text('document_url');
            $table->string('status', 20)->default('pending'); // pending, approved, rejected
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('driver_vehicles', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->string('brand', 50);
            $table->string('model', 50);
            $table->integer('year');
            $table->string('color', 30);
            $table->string('plate', 10);
            $table->string('renavam', 20)->nullable();
            $table->string('category', 20)->default('pop'); // pop, black, mulher, moto
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_vehicles');
        Schema::dropIfExists('driver_documents');
        Schema::dropIfExists('drivers');
        Schema::dropIfExists('trusted_contacts');
        Schema::dropIfExists('passengers');
    }
};
