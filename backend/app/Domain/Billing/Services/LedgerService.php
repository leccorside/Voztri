<?php

namespace App\Domain\Billing\Services;

use App\Models\FinancialLedger;
use App\Models\Ride;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Exception;

class LedgerService
{
    /**
     * Processa a divisão e liquidação financeira de uma corrida finalizada
     */
    public function settleRide(Ride $ride, float $commissionPercent = 15.0): array
    {
        return DB::transaction(function () use ($ride, $commissionPercent) {
            $totalCents = $ride->final_price_cents;
            $platformCents = (int) round($totalCents * ($commissionPercent / 100));
            $driverNetCents = $totalCents - $platformCents;

            // 1. Crédito na conta do motorista
            $driverPrevBalance = $this->getAccountBalance('driver_balance', $ride->driver_id);
            $driverNewBalance = $driverPrevBalance + $driverNetCents;

            $driverEntry = FinancialLedger::create([
                'reference_id' => $ride->id,
                'reference_type' => 'ride',
                'account_type' => 'driver_balance',
                'account_id' => $ride->driver_id,
                'entry_type' => 'credit',
                'amount_cents' => $driverNetCents,
                'balance_after_cents' => $driverNewBalance,
                'description' => "Repasse líquido da corrida #{$ride->id}",
                'created_at' => Carbon::now(),
            ]);

            // 2. Crédito na receita da plataforma
            $platformPrevBalance = $this->getAccountBalance('platform_revenue', $ride->city_id);
            $platformNewBalance = $platformPrevBalance + $platformCents;

            $platformEntry = FinancialLedger::create([
                'reference_id' => $ride->id,
                'reference_type' => 'ride',
                'account_type' => 'platform_revenue',
                'account_id' => $ride->city_id,
                'entry_type' => 'credit',
                'amount_cents' => $platformCents,
                'balance_after_cents' => $platformNewBalance,
                'description' => "Comissão da plataforma ({$commissionPercent}%) corrida #{$ride->id}",
                'created_at' => Carbon::now(),
            ]);

            return [
                'total_cents' => $totalCents,
                'driver_net_cents' => $driverNetCents,
                'platform_commission_cents' => $platformCents,
                'driver_entry_id' => $driverEntry->id,
                'platform_entry_id' => $platformEntry->id,
            ];
        });
    }

    /**
     * Retorna o saldo atual de uma conta através da soma de créditos e débitos
     */
    public function getAccountBalance(string $accountType, string $accountId): int
    {
        $credits = FinancialLedger::where('account_type', $accountType)
            ->where('account_id', $accountId)
            ->where('entry_type', 'credit')
            ->sum('amount_cents');

        $debits = FinancialLedger::where('account_type', $accountType)
            ->where('account_id', $accountId)
            ->where('entry_type', 'debit')
            ->sum('amount_cents');

        return (int) ($credits - $debits);
    }
}
