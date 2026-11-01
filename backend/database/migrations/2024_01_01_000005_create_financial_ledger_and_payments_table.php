<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_ledger', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->uuid('reference_id')->nullable();
            $table->string('reference_type', 50)->nullable();
            $table->string('account_type', 30); // driver_balance, platform_revenue, passenger_wallet, escrow
            $table->uuid('account_id'); // ID do motorista ou da plataforma
            $table->string('entry_type', 10); // credit, debit
            $table->bigInteger('amount_cents');
            $table->bigInteger('balance_after_cents');
            $table->text('description');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('ride_id')->constrained('rides')->cascadeOnDelete();
            $table->string('gateway', 30)->default('mock'); // asaas, mercadopago, mock
            $table->string('gateway_transaction_id', 100)->nullable();
            $table->bigInteger('amount_cents');
            $table->bigInteger('platform_commission_cents')->default(0);
            $table->bigInteger('driver_net_amount_cents')->default(0);
            $table->string('status', 20)->default('pending'); // pending, paid, refunded, disputed
            $table->string('pix_qr_code')->nullable();
            $table->text('pix_copy_paste')->nullable();
            $table->jsonb('raw_response')->nullable();
            $table->timestamps();
        });

        Schema::create('driver_payouts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->bigInteger('amount_cents');
            $table->string('pix_key');
            $table->string('pix_key_type', 20);
            $table->string('status', 20)->default('pending'); // pending, processing, completed, failed
            $table->string('gateway_transfer_id', 100)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_payouts');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('financial_ledger');
    }
};
