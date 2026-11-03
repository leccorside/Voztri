<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\User;
use App\Support\Cpf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DriverRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/driver/registration';

    /** CPFs válidos (dígitos verificadores certos), de exemplo. */
    private const CPF = '52998224725';

    private const OTHER_CPF = '11144477735';

    private const PERSONAL = ['name' => 'Carlos Eduardo Silva', 'cpf' => '529.982.247-25', 'birthDate' => '1990-05-20', 'email' => 'Carlos@Exemplo.com'];

    private function cnh(array $override = []): array
    {
        return [...['number' => '0123 4567 890', 'category' => 'b', 'expiresAt' => now()->addYears(3)->toDateString(), 'hasEar' => true], ...$override];
    }

    /** Motorista novo, como sai do login por OTP. */
    private function newDriver(string $phone = '11922220001'): User
    {
        $this->postJson('/api/v1/auth/request-otp', ['phone' => $phone, 'role' => 'driver'])->assertOk();

        return User::where('phone', $phone)->firstOrFail();
    }

    public function test_driver_from_login_is_registering_without_cnh_and_cannot_go_online(): void
    {
        $u = $this->newDriver();
        $driver = $u->driver;
        $this->assertSame(Driver::STATUS_REGISTERING, $driver->status, 'Nada de aprovado no login.');
        $this->assertNull($driver->cnh_number, 'Nada de CNH fictícia 00000000000.');

        $this->postJson('/api/v1/auth/verify-otp', ['phone' => '11922220001', 'code' => $u->fresh()->otp_code])
            ->assertOk()->assertJsonPath('user.driver_status', 'registering');
        $this->actingAs($u, 'sanctum')->postJson('/api/v1/driver/status', ['isOnline' => true])
            ->assertForbidden()->assertJsonPath('error', 'DRIVER_NOT_APPROVED');

        $this->actingAs($u, 'sanctum')->getJson(self::URL)->assertOk()
            ->assertJsonPath('status', 'registering')
            ->assertJsonPath('nextStep', 'personal')
            ->assertJsonPath('steps.personal.done', false)
            ->assertJsonPath('steps.cnh.done', false);
    }

    public function test_personal_data_is_saved_clean_and_moves_to_the_cnh_step(): void
    {
        $u = $this->newDriver();

        $this->actingAs($u, 'sanctum')->putJson(self::URL . '/personal', self::PERSONAL)->assertOk()
            ->assertJsonPath('steps.personal.done', true)
            ->assertJsonPath('steps.personal.data.cpf', self::CPF)
            ->assertJsonPath('steps.personal.data.birthDate', '1990-05-20')
            ->assertJsonPath('steps.personal.data.email', 'carlos@exemplo.com')
            ->assertJsonPath('nextStep', 'cnh');

        $this->assertSame('Carlos Eduardo Silva', $u->fresh()->name);
        // O /auth/me também reflete (nome e CPF ficam no usuário)
        $this->actingAs($u, 'sanctum')->getJson('/api/v1/auth/me')->assertJsonPath('cpf', self::CPF)->assertJsonPath('driver_status', 'registering');
    }

    public function test_personal_data_validation_in_portuguese(): void
    {
        $u = $this->newDriver();
        $put = fn (array $data) => $this->actingAs($u, 'sanctum')->putJson(self::URL . '/personal', [...self::PERSONAL, ...$data]);

        $put(['name' => 'Carlos'])->assertStatus(422)->assertJsonPath('errors.name.0', 'Informe nome e sobrenome, como estão na CNH.');
        $put(['cpf' => '529.982.247-26'])->assertStatus(422)->assertJsonPath('errors.cpf.0', 'CPF inválido. Confira os números.');
        $put(['cpf' => '111.111.111-11'])->assertStatus(422)->assertJsonPath('errors.cpf.0', 'CPF inválido. Confira os números.');
        $put(['cpf' => '123'])->assertStatus(422)->assertJsonPath('errors.cpf.0', 'O CPF tem 11 números.');
        $put(['birthDate' => now()->subYears(17)->toDateString()])->assertStatus(422)
            ->assertJsonPath('errors.birthDate.0', 'Você precisa ter pelo menos 18 anos para dirigir pela VOZTRI.');
        $put(['birthDate' => '20/05/1990'])->assertStatus(422)->assertJsonPath('errors.birthDate.0', 'Informe a data de nascimento no formato DD/MM/AAAA.');
        $put(['email' => 'nao-e-email'])->assertStatus(422)->assertJsonPath('errors.email.0', 'Informe um e-mail válido.');

        User::create(['name' => 'Outra Pessoa', 'phone' => '11900000000', 'cpf' => self::OTHER_CPF, 'role' => 'passenger', 'status' => 'active']);
        $put(['cpf' => self::OTHER_CPF])->assertStatus(422)->assertJsonPath('errors.cpf.0', 'Este CPF já está cadastrado em outra conta.');

        // Exatamente 18 anos hoje vale; e-mail é opcional
        $put(['birthDate' => now()->subYears(18)->toDateString(), 'email' => ''])->assertOk()->assertJsonPath('steps.personal.data.email', null);
    }

    public function test_cnh_is_saved_and_completes_this_part(): void
    {
        $u = $this->newDriver();
        $this->actingAs($u, 'sanctum')->putJson(self::URL . '/personal', self::PERSONAL)->assertOk();

        $this->actingAs($u, 'sanctum')->putJson(self::URL . '/cnh', $this->cnh())->assertOk()
            ->assertJsonPath('steps.cnh.done', true)
            ->assertJsonPath('steps.cnh.data.number', '01234567890')
            ->assertJsonPath('steps.cnh.data.category', 'B')
            ->assertJsonPath('steps.cnh.data.hasEar', true)
            ->assertJsonPath('nextStep', 'vehicle');

        // Continua em andamento (veículo e documentos vêm depois): ainda não fica online
        $this->assertSame(Driver::STATUS_REGISTERING, $u->driver->fresh()->status);
    }

    public function test_cnh_validation_in_portuguese(): void
    {
        $u = $this->newDriver();
        $put = fn (array $data) => $this->actingAs($u, 'sanctum')->putJson(self::URL . '/cnh', $this->cnh($data));

        $put(['number' => '1234'])->assertStatus(422)->assertJsonPath('errors.number.0', 'O número da CNH (registro) tem 11 números.');
        $put(['number' => '00000000000'])->assertStatus(422)->assertJsonPath('errors.number.0', 'Confira o número da CNH.');
        $put(['category' => 'X'])->assertStatus(422)->assertJsonPath('errors.category.0', 'Escolha uma categoria válida (A, B, AB, C, D ou E).');
        $put(['expiresAt' => now()->subDay()->toDateString()])->assertStatus(422)
            ->assertJsonPath('errors.expiresAt.0', 'Sua CNH está vencida. Renove antes de se cadastrar.');
        $put(['hasEar' => false])->assertStatus(422)
            ->assertJsonPath('errors.hasEar.0', 'Para dirigir por aplicativo, a CNH precisa ter a observação EAR (Exerce Atividade Remunerada), exigida por lei.');

        $other = $this->newDriver('11922220002');
        $this->actingAs($other, 'sanctum')->putJson(self::URL . '/cnh', $this->cnh())->assertOk();
        $this->app['auth']->forgetGuards();
        $put([])->assertStatus(422)->assertJsonPath('errors.number.0', 'Esta CNH já está cadastrada em outra conta.');

        // Vence hoje: ainda vale
        $put(['number' => '98765432100', 'expiresAt' => now()->toDateString()])->assertOk();
    }

    public function test_registration_is_locked_after_it_leaves_the_registering_status(): void
    {
        $u = $this->newDriver();
        $u->driver->forceFill(['status' => Driver::STATUS_PENDING])->save();

        $this->actingAs($u, 'sanctum')->putJson(self::URL . '/cnh', $this->cnh())->assertStatus(409)->assertJsonPath('error', 'REGISTRATION_LOCKED');
        $this->actingAs($u, 'sanctum')->putJson(self::URL . '/personal', self::PERSONAL)->assertStatus(409);
        $this->actingAs($u, 'sanctum')->getJson(self::URL)->assertOk()->assertJsonPath('status', 'pending_approval');
    }

    public function test_only_drivers_and_the_old_auto_approve_route_is_gone(): void
    {
        $this->getJson(self::URL)->assertUnauthorized();
        $passenger = User::create(['name' => 'Bia Lima', 'phone' => '11911110001', 'role' => 'passenger', 'status' => 'active']);
        $this->actingAs($passenger, 'sanctum')->getJson(self::URL)->assertForbidden();

        // Antes: qualquer usuário virava motorista aprovado por aqui
        $this->actingAs($passenger, 'sanctum')->postJson('/api/v1/driver/register', [])->assertNotFound();
        $this->assertSame('passenger', $passenger->fresh()->role);
    }

    public function test_admin_cannot_approve_an_incomplete_registration(): void
    {
        $u = $this->newDriver();
        $admin = User::create(['name' => 'Admin', 'phone' => '11999990000', 'role' => 'admin', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/drivers/{$u->driver->id}/approve")
            ->assertStatus(422)->assertJsonPath('error', 'REGISTRATION_INCOMPLETE');
        $this->assertSame(Driver::STATUS_REGISTERING, $u->driver->fresh()->status);

        $u->driver->forceFill(['status' => Driver::STATUS_PENDING])->save();
        $this->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/drivers/{$u->driver->id}/approve")->assertOk();
    }

    private function vehicle(array $override = []): array
    {
        return [...['brand' => 'Fiat', 'model' => ' Argo  Drive ', 'year' => now()->year - 3, 'color' => 'Prata', 'plate' => 'bra-2e19', 'renavam' => '0123456789-0', 'category' => 'pop'], ...$override];
    }

    /** Motorista com dados pessoais e CNH preenchidos (categoria escolhida). */
    private function driverWithCnh(string $category = 'B', string $phone = '11922220001', string $cnh = '01234567890'): User
    {
        $u = $this->newDriver($phone);
        $u->driver->forceFill(['cnh_number' => $cnh, 'cnh_category' => $category, 'cnh_expires_at' => now()->addYears(2), 'cnh_has_ear' => true])->save();

        return $u;
    }

    public function test_vehicle_is_saved_clean_and_completes_the_steps_so_far(): void
    {
        $u = $this->driverWithCnh('B');
        $this->actingAs($u, 'sanctum')->putJson(self::URL . '/personal', self::PERSONAL)->assertOk();

        $this->actingAs($u, 'sanctum')->putJson(self::URL . '/vehicle', $this->vehicle())->assertOk()
            ->assertJsonPath('steps.vehicle.done', true)
            ->assertJsonPath('steps.vehicle.data.model', 'Argo Drive')
            ->assertJsonPath('steps.vehicle.data.plate', 'BRA2E19')
            ->assertJsonPath('steps.vehicle.data.renavam', '01234567890')
            ->assertJsonPath('steps.vehicle.data.category', 'pop')
            ->assertJsonPath('nextStep', null);

        // De novo substitui (um veículo no cadastro), e RENAVAM antigo de 9 dígitos ganha os zeros
        $this->actingAs($u, 'sanctum')->putJson(self::URL . '/vehicle', $this->vehicle(['plate' => 'ABC1234', 'renavam' => '123456789', 'category' => 'black', 'year' => now()->year - 1]))
            ->assertOk()->assertJsonPath('steps.vehicle.data.renavam', '00123456789')->assertJsonPath('steps.vehicle.data.category', 'black');
        $this->assertSame(1, $u->driver->vehicles()->count());
        $this->assertSame(Driver::STATUS_REGISTERING, $u->driver->fresh()->status, 'Falta enviar os documentos.');
    }

    public function test_cnh_category_must_allow_the_vehicle_type(): void
    {
        $carOnly = $this->driverWithCnh('B');
        $this->actingAs($carOnly, 'sanctum')->putJson(self::URL . '/vehicle', $this->vehicle(['category' => 'moto']))->assertStatus(422)
            ->assertJsonPath('errors.category.0', 'Sua CNH (categoria B) não permite dirigir moto. Para a Moto, a CNH precisa ter a categoria A (A, AB, AC, AD ou AE).');

        $motoOnly = $this->driverWithCnh('A', '11922220002', '11122233344');
        $this->app['auth']->forgetGuards();
        $this->actingAs($motoOnly, 'sanctum')->putJson(self::URL . '/vehicle', $this->vehicle())->assertStatus(422)
            ->assertJsonPath('errors.category.0', 'Sua CNH (categoria A) não permite dirigir carro. Para Pop ou Black, a CNH precisa ter a categoria B ou acima.');
        $this->actingAs($motoOnly, 'sanctum')->putJson(self::URL . '/vehicle', $this->vehicle(['category' => 'moto', 'brand' => 'Honda', 'model' => 'CG 160']))->assertOk();

        // AB e D (que inclui a B) permitem carro; AB também moto
        foreach (['AB' => ['pop', 'moto'], 'D' => ['black'], 'AE' => ['moto', 'pop']] as $category => $vehicles) {
            foreach ($vehicles as $vehicle) {
                $this->assertNull(Driver::vehicleIncompatibility($category, $vehicle), "{$category} permite {$vehicle}");
            }
        }

        // Trocar a CNH para uma categoria que não cobre o veículo já cadastrado é recusado
        $this->actingAs($motoOnly, 'sanctum')->putJson(self::URL . '/cnh', $this->cnh(['number' => '11122233344', 'category' => 'B']))->assertStatus(422)
            ->assertJsonPath('errors.category.0', 'Sua CNH (categoria B) não permite dirigir moto. Para a Moto, a CNH precisa ter a categoria A (A, AB, AC, AD ou AE).');
    }

    public function test_vehicle_validation_in_portuguese(): void
    {
        $u = $this->driverWithCnh('B');
        $put = fn (array $data) => $this->actingAs($u, 'sanctum')->putJson(self::URL . '/vehicle', $this->vehicle($data));
        $year = now()->year;

        $put(['plate' => 'AB12345'])->assertStatus(422)->assertJsonPath('errors.plate.0', 'Placa inválida. Use o formato ABC1D23 (Mercosul) ou ABC1234.');
        $put(['renavam' => '1234'])->assertStatus(422)->assertJsonPath('errors.renavam.0', 'O RENAVAM tem 11 números (ou 9, nos documentos antigos).');
        $put(['renavam' => '00000000000'])->assertStatus(422)->assertJsonPath('errors.renavam.0', 'Confira o RENAVAM.');
        $put(['year' => $year - 16])->assertStatus(422)->assertJsonPath('errors.year.0', 'O veículo pode ter no máximo 15 anos (ano ' . ($year - 15) . ' ou mais novo).');
        $put(['year' => $year - 15])->assertOk();
        $put(['year' => $year - 9, 'category' => 'black'])->assertStatus(422)
            ->assertJsonPath('errors.year.0', 'Para a Black, o veículo pode ter no máximo 8 anos (ano ' . ($year - 8) . ' ou mais novo).');
        $put(['year' => $year + 2])->assertStatus(422)->assertJsonPath('errors.year.0', 'Confira o ano do veículo.');
        $put(['category' => 'mulher'])->assertStatus(422)
            ->assertJsonPath('errors.category.0', 'Escolha Pop, Black ou Moto. A categoria Mulher é definida pela equipe VOZTRI na análise.');
        $put(['brand' => '', 'color' => 'X'])->assertStatus(422)
            ->assertJsonPath('errors.brand.0', 'Informe a marca.')->assertJsonPath('errors.color.0', 'Informe a cor por extenso (ex.: Prata).');

        // Placa e RENAVAM de outro motorista
        $other = $this->driverWithCnh('B', '11922220002', '11122233344');
        $this->app['auth']->forgetGuards();
        $this->actingAs($other, 'sanctum')->putJson(self::URL . '/vehicle', $this->vehicle(['plate' => 'XYZ9A99', 'renavam' => '98765432100']))->assertOk();
        $this->app['auth']->forgetGuards();
        $put(['plate' => 'XYZ-9A99'])->assertStatus(422)->assertJsonPath('errors.plate.0', 'Esta placa já está cadastrada por outro motorista.');
        $put(['renavam' => '98765432100'])->assertStatus(422)->assertJsonPath('errors.renavam.0', 'Este RENAVAM já está cadastrado por outro motorista.');

        // O outro motorista excluiu a conta: o mesmo carro pode entrar num cadastro novo
        $other->driver->forceFill(['status' => 'deleted'])->save();
        $put(['plate' => 'XYZ9A99', 'renavam' => '98765432100'])->assertOk();
    }

    public function test_vehicle_needs_the_cnh_first_and_is_locked_after_submission(): void
    {
        $u = $this->newDriver();
        $this->actingAs($u, 'sanctum')->putJson(self::URL . '/vehicle', $this->vehicle())->assertStatus(422)->assertJsonPath('error', 'CNH_REQUIRED');

        $u->driver->forceFill(['status' => Driver::STATUS_PENDING])->save();
        $this->actingAs($u, 'sanctum')->putJson(self::URL . '/vehicle', $this->vehicle())->assertStatus(409)->assertJsonPath('error', 'REGISTRATION_LOCKED');
    }

    public function test_cpf_check_digits(): void
    {
        $this->assertTrue(Cpf::isValid('529.982.247-25'));
        $this->assertTrue(Cpf::isValid('11144477735'));
        $this->assertFalse(Cpf::isValid('52998224724'));
        $this->assertFalse(Cpf::isValid('00000000000'));
        $this->assertFalse(Cpf::isValid('5299822472'));
        $this->assertFalse(Cpf::isValid(null));
    }
}
