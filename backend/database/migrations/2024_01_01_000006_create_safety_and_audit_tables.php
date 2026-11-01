<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('safety_incidents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('ride_id')->constrained('rides')->cascadeOnDelete();
            $table->foreignUuid('reported_by')->constrained('users')->cascadeOnDelete();
            $table->string('type', 30); // sos_trigger, route_deviation, verbal_abuse, physical_threat
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('status', 20)->default('active'); // active, investigating, resolved, false_alarm
            $table->text('notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ride_ratings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('ride_id')->constrained('rides')->cascadeOnDelete();
            $table->foreignUuid('rater_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('rated_user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('rating'); // 1 a 5
            $table->integer('tip_cents')->default(0);
            $table->text('feedback')->nullable();
            $table->jsonb('tags')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 50); // fare_update, driver_approval, user_ban, refund
            $table->string('target_entity', 50);
            $table->uuid('target_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->jsonb('old_values')->nullable();
            $table->jsonb('new_values')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('ride_ratings');
        Schema::dropIfExists('safety_incidents');
    }
};
