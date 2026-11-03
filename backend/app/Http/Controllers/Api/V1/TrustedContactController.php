<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Passenger;
use App\Models\TrustedContact;
use Illuminate\Http\Request;
use Illuminate\Validation\Validator;

/**
 * Contatos de confiança do passageiro: recebem um SMS quando ele aciona o SOS (e
 * quando o desativa). Até 5 contatos, com nome e celular brasileiro.
 */
class TrustedContactController extends Controller
{
    public const MAX_CONTACTS = 5;

    public function index(Request $request)
    {
        return response()->json($this->list($this->passenger($request)));
    }

    public function store(Request $request)
    {
        $passenger = $this->passenger($request);
        if (TrustedContact::where('passenger_id', $passenger->id)->count() >= self::MAX_CONTACTS) {
            return response()->json([
                'message' => 'Você pode ter até ' . self::MAX_CONTACTS . ' contatos de confiança. Remova um para adicionar outro.',
                'error' => 'TOO_MANY_CONTACTS',
            ], 422);
        }

        $data = $this->validated($request, $passenger);
        $contact = TrustedContact::create(['passenger_id' => $passenger->id, ...$data]);

        return response()->json($this->present($contact), 201);
    }

    public function update(Request $request, string $id)
    {
        $passenger = $this->passenger($request);
        $contact = TrustedContact::where('passenger_id', $passenger->id)->whereKey($id)->first();
        if (!$contact) {
            return response()->json(['message' => 'Contato não encontrado.', 'error' => 'NOT_FOUND'], 404);
        }

        $contact->update($this->validated($request, $passenger, $contact->id));

        return response()->json($this->present($contact));
    }

    public function destroy(Request $request, string $id)
    {
        $passenger = $this->passenger($request);
        TrustedContact::where('passenger_id', $passenger->id)->whereKey($id)->delete();

        return response()->json($this->list($passenger));
    }

    private function passenger(Request $request): Passenger
    {
        return Passenger::firstOrCreate(['user_id' => $request->user()->id]);
    }

    private function list(Passenger $passenger): array
    {
        return TrustedContact::where('passenger_id', $passenger->id)->orderBy('created_at')->get()
            ->map(fn (TrustedContact $c) => $this->present($c))->all();
    }

    private function present(TrustedContact $contact): array
    {
        return ['id' => $contact->id, 'name' => $contact->name, 'phone' => $contact->phone];
    }

    /**
     * Nome sem espaços repetidos; celular só com dígitos, sem o +55. Celular de DDD
     * válido (11 dígitos, começando por 9 depois do DDD), porque o aviso é por SMS.
     */
    private function validated(Request $request, Passenger $passenger, ?string $ignoreId = null): array
    {
        $name = $request->input('name');
        $phone = $request->input('phone');
        $input = [
            'name' => is_string($name) ? preg_replace('/\s+/u', ' ', trim($name)) : $name,
            'phone' => is_string($phone) ? preg_replace('/\D/', '', $phone) : $phone,
        ];
        if (is_string($input['phone']) && strlen($input['phone']) === 13 && str_starts_with($input['phone'], '55')) {
            $input['phone'] = substr($input['phone'], 2);
        }

        $ownPhone = $request->user()->phone;
        $taken = TrustedContact::where('passenger_id', $passenger->id)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->pluck('phone')->all();

        return validator($input, [
            'name' => 'required|string|min:2|max:100',
            'phone' => ['required', 'string', 'regex:/^[1-9][1-9]9\d{8}$/'],
        ], [
            'name.required' => 'Informe o nome do contato.',
            'name.min' => 'O nome precisa ter pelo menos 2 letras.',
            'name.max' => 'O nome pode ter no máximo 100 caracteres.',
            'phone.required' => 'Informe o celular do contato.',
            'phone.regex' => 'Informe um celular com DDD, ex.: (11) 98765-4321.',
        ])->after(function (Validator $v) use ($input, $ownPhone, $taken) {
            if (!is_string($input['phone'])) {
                return;
            }
            if ($input['phone'] === $ownPhone) {
                $v->errors()->add('phone', 'Este é o seu próprio número. Escolha outra pessoa.');
            } elseif (in_array($input['phone'], $taken, true)) {
                $v->errors()->add('phone', 'Este celular já está na sua lista.');
            }
        })->validate();
    }
}
