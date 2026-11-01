<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Ride;
use App\Models\Payment;
use App\Models\Driver;
use App\Models\FinancialLedger;
use App\Models\RideRating;
use App\Models\UserProfile;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BillingController extends Controller
{
    /**
     * Gera cobrança Pix dinâmica para a corrida
     */
    public function generatePix(Request $request, $id)
    {
        $ride = Ride::findOrFail($id);

        $pixPayload = "00020126580014br.gov.bcb.pix0136".Str::uuid()."5204000053039865405".number_format($ride->final_price_cents/100, 2, '.', '')."5802BR5910VOZTRI BRASIL6009SAO PAULO62070503***6304ABCD";

        $payment = Payment::updateOrCreate(
            ['ride_id' => $ride->id],
            [
                'gateway' => 'mock',
                'gateway_transaction_id' => 'PIX_TX_'.Str::upper(Str::random(12)),
                'amount_cents' => $ride->final_price_cents,
                'status' => 'pending',
                'pix_copy_paste' => $pixPayload,
                'pix_qr_code' => 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzBhMGYyNSIvPjwvc3ZnPg==',
            ]
        );

        return response()->json([
            'qrCodeUrl' => 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data='.urlencode($pixPayload),
            'qrCodeBase64' => $payment->pix_qr_code,
            'pixCopyPaste' => $pixPayload,
            'amountCents' => $ride->final_price_cents,
            'expiresAt' => Carbon::now()->addMinutes(15)->toIso8601String(),
        ]);
    }

    /**
     * Retorna cartões salvos para o usuário
     */
    public function getCards(Request $request)
    {
        return response()->json([
            [
                'id' => 'card_mock_1',
                'brand' => 'Mastercard',
                'lastFourDigits' => '8492',
                'holderName' => 'JOHNATHAN AMORIM',
                'expiryMonth' => '08',
                'expiryYear' => '29',
                'isDefault' => true,
            ],
            [
                'id' => 'card_mock_2',
                'brand' => 'Visa',
                'lastFourDigits' => '3301',
                'holderName' => 'JOHNATHAN AMORIM',
                'expiryMonth' => '11',
                'expiryYear' => '28',
                'isDefault' => false,
            ],
        ]);
    }

    /**
     * Solicita repasse via Pix para motorista
     */
    public function requestPayout(Request $request)
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->firstOrFail();

        $validated = $request->validate([
            'amountCents' => 'required|integer|min:1000', // mínimo R$ 10,00
            'pixKey' => 'required|string',
            'pixKeyType' => 'required|string|in:cpf,cnpj,email,phone,random',
        ]);

        $balance = function () use ($driver): int {
            $entries = FinancialLedger::where('account_type', 'driver_balance')->where('account_id', $driver->id);
            $credits = (clone $entries)->where('entry_type', 'credit')->sum('amount_cents');
            $debits = (clone $entries)->where('entry_type', 'debit')->sum('amount_cents');

            return (int) ($credits - $debits);
        };

        $available = $balance();
        if ($validated['amountCents'] > $available) {
            return response()->json([
                'message' => 'Saldo insuficiente para o repasse solicitado.',
                'error' => 'INSUFFICIENT_BALANCE',
                'availableBalanceCents' => $available,
            ], 422);
        }

        // Registra o débito no ledger do motorista
        FinancialLedger::create([
            'reference_id' => Str::uuid(),
            'reference_type' => 'payout',
            'account_type' => 'driver_balance',
            'account_id' => $driver->id,
            'entry_type' => 'debit',
            'amount_cents' => $validated['amountCents'],
            'balance_after_cents' => $available - $validated['amountCents'],
            'description' => "Repasse Pix para chave {$validated['pixKey']}",
            'created_at' => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Solicitação de repasse Pix processada com sucesso!',
            'payoutId' => Str::uuid()->toString(),
        ]);
    }

    /**
     * Avaliação com gorjeta opcional
     */
    public function submitRating(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'rideId' => 'required|uuid',
            'rating' => 'required|integer|between:1,5',
            'tipCents' => 'nullable|integer|min:0',
            'feedbackText' => 'nullable|string|max:500',
            'tags' => 'nullable|array',
        ]);

        $ride = Ride::with(['passenger', 'driver'])->findOrFail($validated['rideId']);

        if (!$ride->passenger || $ride->passenger->user_id !== $user->id || !$ride->driver) {
            return response()->json(['message' => 'Você não pode avaliar esta corrida.', 'error' => 'FORBIDDEN'], 403);
        }

        if ($ride->status !== 'COMPLETED') {
            return response()->json(['message' => 'Só é possível avaliar corridas concluídas.', 'error' => 'INVALID_STATE'], 409);
        }

        if (RideRating::where('ride_id', $ride->id)->where('rater_id', $user->id)->exists()) {
            return response()->json(['message' => 'Esta corrida já foi avaliada.', 'error' => 'ALREADY_RATED'], 409);
        }

        DB::transaction(function () use ($ride, $user, $validated) {
            RideRating::create([
                'ride_id' => $ride->id,
                'rater_id' => $user->id,
                'rated_user_id' => $ride->driver->user_id,
                'rating' => $validated['rating'],
                'tip_cents' => $validated['tipCents'] ?? 0,
                'feedback' => $validated['feedbackText'] ?? null,
                'tags' => $validated['tags'] ?? [],
            ]);

            // Atualiza a média exibida no perfil do motorista
            $profile = UserProfile::firstOrCreate(['user_id' => $ride->driver->user_id], ['rating_avg' => 5.0, 'total_ratings' => 0]);
            $total = (int) $profile->total_ratings;
            $profile->rating_avg = round((($profile->rating_avg * $total) + $validated['rating']) / ($total + 1), 2);
            $profile->total_ratings = $total + 1;
            $profile->save();
        });

        return response()->json([
            'success' => true,
            'message' => 'Obrigado por sua avaliação!',
        ]);
    }

    /**
     * Webhook de pagamentos (Asaas / Mercado Pago / Sandbox)
     */
    public function handleWebhook(Request $request)
    {
        $payload = $request->all();

        // Processa evento de confirmação de pagamento
        if (isset($payload['event']) && $payload['event'] === 'PAYMENT_RECEIVED') {
            $txId = $payload['payment']['id'] ?? null;
            if ($txId) {
                Payment::where('gateway_transaction_id', $txId)->update(['status' => 'paid']);
            }
        }

        return response()->json(['received' => true]);
    }
}

