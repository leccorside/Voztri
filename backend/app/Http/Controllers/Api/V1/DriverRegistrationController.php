<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\DriverVehicle;
use App\Models\User;
use App\Models\UserProfile;
use App\Support\Cpf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Validator;

/**
 * Cadastro do motorista pelo app, por etapas (Fase 13). Esta primeira parte cobre
 * os dados pessoais e a CNH; veículo e documentos vêm nas próximas. As etapas só
 * podem ser editadas enquanto o cadastro está em andamento: depois de enviado para
 * análise (ou aprovado), mudar a CNH sem nova análise não é permitido.
 */
class DriverRegistrationController extends Controller
{
    /** Idade mínima para dirigir pelo app (CNH definitiva exige 18 anos). */
    public const MIN_AGE = 18;

    public function show(Request $request)
    {
        return response()->json($this->summary($request->user()));
    }

    /** Dados pessoais: nome completo, CPF, nascimento e e-mail (opcional). */
    public function updatePersonal(Request $request)
    {
        $user = $request->user();
        if ($locked = $this->locked($user)) {
            return $locked;
        }

        $input = [
            'name' => is_string($request->input('name')) ? preg_replace('/\s+/u', ' ', trim($request->input('name'))) : $request->input('name'),
            'cpf' => is_string($request->input('cpf')) ? Cpf::digits($request->input('cpf')) : $request->input('cpf'),
            'birthDate' => $request->input('birthDate'),
            'email' => is_string($request->input('email')) ? mb_strtolower(trim($request->input('email'))) : $request->input('email'),
        ];
        if ($input['email'] === '') {
            $input['email'] = null;
        }

        $latestBirth = Carbon::today()->subYears(self::MIN_AGE)->toDateString();
        $data = validator($input, [
            'name' => ['required', 'string', 'min:5', 'max:100', 'regex:/^\S+(\s+\S+)+$/u'],
            'cpf' => 'required|string|size:11|unique:users,cpf,' . $user->id,
            'birthDate' => "required|date_format:Y-m-d|before_or_equal:{$latestBirth}|after:1900-01-01",
            'email' => 'nullable|string|email:rfc|max:255|unique:users,email,' . $user->id,
        ], [
            'name.required' => 'Informe seu nome completo.',
            'name.min' => 'Informe seu nome completo, como está na CNH.',
            'name.regex' => 'Informe nome e sobrenome, como estão na CNH.',
            'name.max' => 'O nome pode ter no máximo 100 caracteres.',
            'cpf.required' => 'Informe seu CPF.',
            'cpf.size' => 'O CPF tem 11 números.',
            'cpf.unique' => 'Este CPF já está cadastrado em outra conta.',
            'birthDate.required' => 'Informe sua data de nascimento.',
            'birthDate.date_format' => 'Informe a data de nascimento no formato DD/MM/AAAA.',
            'birthDate.before_or_equal' => 'Você precisa ter pelo menos ' . self::MIN_AGE . ' anos para dirigir pela VOZTRI.',
            'birthDate.after' => 'Confira a data de nascimento.',
            'email.email' => 'Informe um e-mail válido.',
            'email.unique' => 'Este e-mail já está em uso por outra conta.',
        ])->after(function (Validator $v) use ($input) {
            if (strlen((string) $input['cpf']) === 11 && !Cpf::isValid($input['cpf'])) {
                $v->errors()->add('cpf', 'CPF inválido. Confira os números.');
            }
        })->validate();

        $user->fill(['name' => $data['name'], 'cpf' => $data['cpf'], 'email' => $data['email'] ?? null])->save();
        UserProfile::updateOrCreate(['user_id' => $user->id], ['birth_date' => $data['birthDate']]);

        return response()->json($this->summary($user->fresh()));
    }

    /** CNH: número, categoria, validade e a observação EAR (exigida pela Lei 13.640). */
    public function updateCnh(Request $request)
    {
        $user = $request->user();
        if ($locked = $this->locked($user)) {
            return $locked;
        }

        $input = [
            'number' => is_string($request->input('number')) ? preg_replace('/\D/', '', $request->input('number')) : $request->input('number'),
            'category' => is_string($request->input('category')) ? strtoupper(trim($request->input('category'))) : $request->input('category'),
            'expiresAt' => $request->input('expiresAt'),
            'hasEar' => $request->input('hasEar'),
        ];

        $data = validator($input, [
            'number' => ['required', 'string', 'regex:/^\d{11}$/', 'not_regex:/^(\d)\1{10}$/'],
            'category' => 'required|string|in:' . implode(',', Driver::CNH_CATEGORIES),
            'expiresAt' => 'required|date_format:Y-m-d|after_or_equal:today',
            'hasEar' => 'required|boolean|accepted',
        ], [
            'number.required' => 'Informe o número da CNH.',
            'number.regex' => 'O número da CNH (registro) tem 11 números.',
            'number.not_regex' => 'Confira o número da CNH.',
            'category.required' => 'Escolha a categoria da CNH.',
            'category.in' => 'Escolha uma categoria válida (A, B, AB, C, D ou E).',
            'expiresAt.required' => 'Informe a validade da CNH.',
            'expiresAt.date_format' => 'Informe a validade no formato DD/MM/AAAA.',
            'expiresAt.after_or_equal' => 'Sua CNH está vencida. Renove antes de se cadastrar.',
            'hasEar.required' => 'Informe se a CNH tem a observação EAR.',
            'hasEar.accepted' => 'Para dirigir por aplicativo, a CNH precisa ter a observação EAR (Exerce Atividade Remunerada), exigida por lei.',
        ])->after(function (Validator $v) use ($input, $user) {
            $number = $input['number'];
            if (is_string($number) && preg_match('/^\d{11}$/', $number)
                && Driver::where('cnh_number', $number)->where('user_id', '!=', $user->id)->exists()) {
                $v->errors()->add('number', 'Esta CNH já está cadastrada em outra conta.');
            }
            // Trocar a categoria não pode deixar o veículo já cadastrado sem habilitação
            $vehicle = $this->driver($user)->vehicles()->first();
            if ($vehicle && is_string($input['category']) && in_array($input['category'], Driver::CNH_CATEGORIES, true)
                && ($message = $this->incompatibility($input['category'], $vehicle->category))) {
                $v->errors()->add('category', $message);
            }
        })->validate();

        $driver = $this->driver($user);
        $driver->forceFill([
            'cnh_number' => $data['number'],
            'cnh_category' => $data['category'],
            'cnh_expires_at' => $data['expiresAt'],
            'cnh_has_ear' => true,
        ])->save();

        return response()->json($this->summary($user->fresh()));
    }

    /**
     * Veículo: marca, modelo, ano, cor, placa, RENAVAM e categoria (pop, black ou
     * moto). A categoria da CNH precisa permitir o tipo (moto: A; carro: B ou acima),
     * por isso a CNH vem antes.
     */
    public function updateVehicle(Request $request)
    {
        $user = $request->user();
        if ($locked = $this->locked($user)) {
            return $locked;
        }
        $driver = $this->driver($user);
        if (!$driver->cnh_number) {
            return response()->json([
                'message' => 'Preencha a CNH antes do veículo: a categoria dela define se você pode dirigir carro ou moto.',
                'error' => 'CNH_REQUIRED',
            ], 422);
        }

        $clean = fn (string $key) => is_string($request->input($key)) ? preg_replace('/\s+/u', ' ', trim($request->input($key))) : $request->input($key);
        $renavam = is_string($request->input('renavam')) ? preg_replace('/\D/', '', $request->input('renavam')) : $request->input('renavam');
        $input = [
            'brand' => $clean('brand'),
            'model' => $clean('model'),
            'year' => $request->input('year'),
            'color' => $clean('color'),
            'plate' => is_string($request->input('plate')) ? DriverVehicle::normalizePlate($request->input('plate')) : $request->input('plate'),
            // RENAVAM antigo tem 9 dígitos: completa com zeros à esquerda (formato atual, 11)
            'renavam' => is_string($renavam) && strlen($renavam) === 9 ? '00' . $renavam : $renavam,
            'category' => is_string($request->input('category')) ? strtolower(trim($request->input('category'))) : $request->input('category'),
        ];

        $thisYear = (int) Carbon::now()->year;
        $data = validator($input, [
            'brand' => 'required|string|min:2|max:50',
            'model' => 'required|string|min:1|max:50',
            'year' => 'required|integer|max:' . ($thisYear + 1),
            'color' => 'required|string|min:3|max:30',
            'plate' => ['required', 'string', 'regex:/^[A-Z]{3}\d[A-Z0-9]\d{2}$/'],
            'renavam' => ['required', 'string', 'regex:/^\d{11}$/', 'not_regex:/^(\d)\1{10}$/'],
            'category' => 'required|string|in:' . implode(',', DriverVehicle::SELF_SERVICE_CATEGORIES),
        ], [
            'brand.required' => 'Informe a marca.',
            'brand.min' => 'Informe a marca.',
            'model.required' => 'Informe o modelo.',
            'year.required' => 'Informe o ano do veículo.',
            'year.integer' => 'Informe o ano com 4 números.',
            'year.max' => 'Confira o ano do veículo.',
            'color.required' => 'Informe a cor.',
            'color.min' => 'Informe a cor por extenso (ex.: Prata).',
            'plate.required' => 'Informe a placa.',
            'plate.regex' => 'Placa inválida. Use o formato ABC1D23 (Mercosul) ou ABC1234.',
            'renavam.required' => 'Informe o RENAVAM (está no documento do veículo, o CRLV).',
            'renavam.regex' => 'O RENAVAM tem 11 números (ou 9, nos documentos antigos).',
            'renavam.not_regex' => 'Confira o RENAVAM.',
            'category.required' => 'Escolha a categoria.',
            'category.in' => 'Escolha Pop, Black ou Moto. A categoria Mulher é definida pela equipe VOZTRI na análise.',
        ])->after(function (Validator $v) use ($input, $driver, $thisYear) {
            $category = $input['category'];
            if (!is_string($category) || !in_array($category, DriverVehicle::SELF_SERVICE_CATEGORIES, true)) {
                return;
            }
            if ($message = $this->incompatibility($driver->cnh_category, $category)) {
                $v->errors()->add('category', $message);
            }
            if (is_numeric($input['year'])) {
                $maxAge = $category === 'black' ? DriverVehicle::BLACK_MAX_AGE_YEARS : DriverVehicle::MAX_AGE_YEARS;
                if ((int) $input['year'] < $thisYear - $maxAge) {
                    $v->errors()->add('year', $category === 'black'
                        ? 'Para a Black, o veículo pode ter no máximo ' . DriverVehicle::BLACK_MAX_AGE_YEARS . ' anos (ano ' . ($thisYear - DriverVehicle::BLACK_MAX_AGE_YEARS) . ' ou mais novo).'
                        : 'O veículo pode ter no máximo ' . DriverVehicle::MAX_AGE_YEARS . ' anos (ano ' . ($thisYear - DriverVehicle::MAX_AGE_YEARS) . ' ou mais novo).');
                }
            }
            // Veículos de contas excluídas ficam (histórico das corridas), mas não bloqueiam
            // o mesmo carro num cadastro novo
            $others = fn () => DriverVehicle::where('driver_id', '!=', $driver->id)
                ->whereNotIn('driver_id', Driver::where('status', 'deleted')->select('id'));
            if (is_string($input['plate']) && $others()->where('plate', $input['plate'])->exists()) {
                $v->errors()->add('plate', 'Esta placa já está cadastrada por outro motorista.');
            }
            if (is_string($input['renavam']) && $others()->where('renavam', $input['renavam'])->exists()) {
                $v->errors()->add('renavam', 'Este RENAVAM já está cadastrado por outro motorista.');
            }
        })->validate();

        // Um veículo no cadastro: a etapa substitui o anterior
        $vehicle = $driver->vehicles()->first() ?? new DriverVehicle(['driver_id' => $driver->id]);
        $vehicle->fill([...$data, 'year' => (int) $data['year'], 'is_active' => true])->save();

        return response()->json($this->summary($user->fresh()));
    }

    private function incompatibility(?string $cnhCategory, string $vehicleCategory): ?string
    {
        return Driver::vehicleIncompatibility($cnhCategory, $vehicleCategory);
    }

    private function driver(User $user): Driver
    {
        return Driver::firstOrCreate(['user_id' => $user->id], ['status' => Driver::STATUS_REGISTERING]);
    }

    /** 409 quando o cadastro já saiu do "em andamento" (enviado, aprovado, bloqueado...). */
    private function locked(User $user)
    {
        $status = $this->driver($user)->status;
        if ($status === Driver::STATUS_REGISTERING) {
            return null;
        }

        return response()->json([
            'message' => 'Seu cadastro já foi enviado para análise e não pode ser alterado pelo app. Fale com o suporte para corrigir algum dado.',
            'error' => 'REGISTRATION_LOCKED',
        ], 409);
    }

    /**
     * Situação do cadastro para o app: o status, o que já foi preenchido em cada etapa
     * e a próxima etapa pendente (null quando as etapas desta parte estão completas).
     */
    private function summary(User $user): array
    {
        $driver = $this->driver($user);
        $birth = UserProfile::where('user_id', $user->id)->value('birth_date');

        $personal = [
            'name' => $user->name,
            'cpf' => $user->cpf,
            'birthDate' => $birth ? Carbon::parse($birth)->toDateString() : null,
            'email' => $user->email,
        ];
        $personalDone = (bool) ($user->cpf && $birth && preg_match('/^\S+(\s+\S+)+$/u', (string) $user->name));

        $cnh = [
            'number' => $driver->cnh_number ?: null,
            'category' => $driver->cnh_number ? $driver->cnh_category : null,
            'expiresAt' => $driver->cnh_expires_at?->toDateString(),
            'hasEar' => (bool) $driver->cnh_has_ear,
        ];
        $cnhDone = (bool) ($driver->cnh_number && $driver->cnh_expires_at && $driver->cnh_has_ear);

        $v = $driver->vehicles()->first();
        $vehicle = [
            'brand' => $v?->brand,
            'model' => $v?->model,
            'year' => $v?->year,
            'color' => $v?->color,
            'plate' => $v?->plate,
            'renavam' => $v?->renavam,
            'category' => $v?->category,
        ];
        $vehicleDone = (bool) ($v && $v->renavam);

        return [
            'status' => $driver->status,
            'steps' => [
                'personal' => ['done' => $personalDone, 'data' => $personal],
                'cnh' => ['done' => $cnhDone, 'data' => $cnh],
                'vehicle' => ['done' => $vehicleDone, 'data' => $vehicle],
            ],
            'nextStep' => !$personalDone ? 'personal' : (!$cnhDone ? 'cnh' : (!$vehicleDone ? 'vehicle' : null)),
        ];
    }
}
