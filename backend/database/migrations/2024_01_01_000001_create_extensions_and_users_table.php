<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Ativa extensões PostgreSQL / PostGIS
        DB::statement('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        DB::statement('CREATE EXTENSION IF NOT EXISTS "postgis";');

        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->string('phone', 20)->unique();
            $table->string('name', 100);
            $table->string('email', 100)->nullable()->unique();
            $table->string('cpf', 14)->nullable()->unique();
            $table->string('avatar_url')->nullable();
            $table->string('password_hash')->nullable();
            $table->string('role', 20)->default('passenger'); // passenger, driver, admin
            $table->string('status', 20)->default('active'); // pending, active, suspended, blocked
            $table->string('otp_code', 6)->nullable();
            $table->timestamp('otp_expires_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('user_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('birth_date')->nullable();
            $table->string('gender', 20)->nullable();
            $table->decimal('rating_avg', 3, 2)->default(5.00);
            $table->integer('total_ratings')->default(0);
            $table->timestamps();
        });

        Schema::create('user_devices', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('platform', 20); // android, ios, web
            $table->text('fcm_token')->nullable();
            $table->string('device_id', 100)->nullable();
            $table->timestamp('last_active_at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->uuidMorphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('user_devices');
        Schema::dropIfExists('user_profiles');
        Schema::dropIfExists('users');
    }
};
