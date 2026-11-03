<?php

namespace Tests\Feature;

use App\Infrastructure\Sms\SmsSender;
use App\Models\City;
use App\Models\Driver;
use App\Models\DriverVehicle;
use App\Models\Passenger;
use App\Models\Ride;
use App\Models\SafetyIncident;
use App\Models\TrustedContact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrustedContactsTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/passenger/trusted-contacts';

    /** SMS enviados no teste: [telefone, texto]. */
    private array $sms = [];

    protected function setUp(): void
    {
        parent::setUp();
        $sent = &$this->sms;
        $this->app->instance(SmsSender::class, new class($sent) implements SmsSender {
            public function __construct(private array &$sent) {}

            public function send(string $phone, string $text): bool
            {
                $this->sent[] = [$phone, $text];

                return true;
            }

            public function isEnabled(): bool
            {
                return true;
            }
        });
    }

    private function passenger(string $phone = '11911110001'): User
    {
        $user = User::create(['name' => 'Beatriz Lima', 'phone' => $phone, 'role' => 'passenger', 'status' => 'active']);
        Passenger::create(['user_id' => $user->id, 'emergency_pin' => '2580']);

        return $user;
    }

    private function add(User $u, string $name, string $phone)
    {
        return $this->actingAs($u, 'sanctum')->postJson(self::URL, ['name' => $name, 'phone' => $phone]);
    }

    /** Corrida em andamento com motorista e carro (o SMS leva o carro e a placa). */
    private function rideFor(User $passenger): Ride
    {
        $du = User::create(['name' => 'Carlos Eduardo', 'phone' => '11922220001', 'role' => 'driver', 'status' => 'active']);
        $driver = Driver::create([
            'user_id' => $du->id, 'cnh_number' => '12345678900', 'cnh_category' => 'B',
            'cnh_expires_at' => now()->addYear(), 'cnh_has_ear' => true, 'status' => 'approved', 'is_online' => true,
        ]);
        DriverVehicle::create(['driver_id' => $driver->id, 'brand' => 'Fiat', 'model' => 'Argo', 'year' => 2022, 'color' => 'Prata', 'plate' => 'BRA2E19', 'category' => 'pop', 'is_active' => true]);

        return Ride::create([
            'passenger_id' => $passenger->passenger->id, 'driver_id' => $driver->id,
            'city_id' => City::create(['name' => 'São Paulo', 'state' => 'SP', 'is_active' => true])->id,
            'category' => 'pop', 'status' => 'IN_PROGRESS', 'pickup_address' => 'A', 'dropoff_address' => 'B',
            'boarding_pin' => '1111', 'payment_method' => 'pix', 'payment_status' => 'pending',
            'estimated_price_cents' => 1000, 'final_price_cents' => 1000, 'distance_meters' => 1000, 'duration_seconds' => 300,
        ]);
    }

    public function test_crud_cleans_the_phone_and_lists_in_order(): void
    {
        $this->getJson(self::URL)->assertUnauthorized();
        $bia = $this->passenger();

        $this->actingAs($bia, 'sanctum')->getJson(self::URL)->assertOk()->assertExactJson([]);
        $mae = $this->add($bia, '  Maria   Lima ', '+55 (11) 98765-4321')->assertCreated()
            ->assertJsonPath('name', 'Maria Lima')->assertJsonPath('phone', '11987654321')->json('id');
        $this->add($bia, 'João', '(21) 99876-5432')->assertCreated();

        $this->actingAs($bia, 'sanctum')->getJson(self::URL)->assertOk()
            ->assertJsonCount(2)->assertJsonPath('0.name', 'Maria Lima')->assertJsonPath('1.phone', '21998765432');

        $this->actingAs($bia, 'sanctum')->putJson(self::URL . "/{$mae}", ['name' => 'Mãe', 'phone' => '11987654321'])
            ->assertOk()->assertJsonPath('name', 'Mãe');

        $this->actingAs($bia, 'sanctum')->deleteJson(self::URL . "/{$mae}")->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'João');
    }

    public function test_validation_messages_in_portuguese(): void
    {
        $bia = $this->passenger();

        $this->add($bia, '', '')->assertStatus(422)
            ->assertJsonPath('errors.name.0', 'Informe o nome do contato.')
            ->assertJsonPath('errors.phone.0', 'Informe o celular do contato.');
        // Fixo (sem o 9) não recebe SMS
        $this->add($bia, 'Escritório', '(11) 3456-7890')->assertStatus(422)
            ->assertJsonPath('errors.phone.0', 'Informe um celular com DDD, ex.: (11) 98765-4321.');
        $this->add($bia, 'Eu mesma', '11911110001')->assertStatus(422)
            ->assertJsonPath('errors.phone.0', 'Este é o seu próprio número. Escolha outra pessoa.');
        $this->add($bia, 'Maria', '11987654321')->assertCreated();
        $this->add($bia, 'Maria de novo', '(11) 98765-4321')->assertStatus(422)
            ->assertJsonPath('errors.phone.0', 'Este celular já está na sua lista.');
    }

    public function test_at_most_five_contacts(): void
    {
        $bia = $this->passenger();
        foreach (range(1, 5) as $i) {
            $this->add($bia, "Contato {$i}", "1198765432{$i}")->assertCreated();
        }
        $this->add($bia, 'Sexto', '11987654329')->assertStatus(422)->assertJsonPath('error', 'TOO_MANY_CONTACTS');
    }

    public function test_contacts_are_private_to_the_passenger_and_drivers_have_no_access(): void
    {
        $bia = $this->passenger();
        $ana = $this->passenger('11911110002');
        $id = $this->add($bia, 'Maria', '11987654321')->json('id');

        $this->actingAs($ana, 'sanctum')->getJson(self::URL)->assertExactJson([]);
        $this->actingAs($ana, 'sanctum')->putJson(self::URL . "/{$id}", ['name' => 'X', 'phone' => '11987654321'])->assertNotFound();
        $this->actingAs($ana, 'sanctum')->deleteJson(self::URL . "/{$id}")->assertOk();
        $this->assertNotNull(TrustedContact::find($id), 'Outra passageira não apaga.');

        $driver = User::create(['name' => 'Carlos', 'phone' => '11922220009', 'role' => 'driver', 'status' => 'active']);
        $this->actingAs($driver, 'sanctum')->getJson(self::URL)->assertForbidden();
    }

    public function test_sos_sends_an_sms_with_location_car_and_plate_and_another_when_disabled(): void
    {
        $bia = $this->passenger();
        $this->add($bia, 'Maria', '11987654321')->assertCreated();
        $this->add($bia, 'João', '21998765432')->assertCreated();
        $ride = $this->rideFor($bia);

        $this->actingAs($bia, 'sanctum')->postJson("/api/v1/rides/{$ride->id}/sos", ['latitude' => -23.561414, 'longitude' => -46.655881])
            ->assertOk()->assertJsonPath('trustedContactsNotified', 2);

        $this->assertSame(['11987654321', '21998765432'], array_column($this->sms, 0));
        $text = $this->sms[0][1];
        $this->assertStringContainsString('Beatriz ((11) 91111-0001) acionou o alerta de emergência', $text);
        $this->assertStringContainsString('https://maps.google.com/?q=-23.561414,-46.655881', $text);
        $this->assertStringContainsString('Fiat Argo Prata, placa BRA2E19 (motorista Carlos)', $text);
        $this->assertStringNotContainsString('Lima', $text, 'Só o primeiro nome.');

        // Tocar de novo com o alerta ativo atualiza a posição, sem repetir o SMS
        $this->actingAs($bia, 'sanctum')->postJson("/api/v1/rides/{$ride->id}/sos", ['latitude' => -23.57, 'longitude' => -46.66])
            ->assertOk()->assertJsonPath('trustedContactsNotified', 2);
        $this->assertCount(2, $this->sms);
        $this->assertSame(1, SafetyIncident::where('ride_id', $ride->id)->count());
        $this->assertEqualsWithDelta(-23.57, SafetyIncident::where('ride_id', $ride->id)->value('latitude'), 0.0001);

        // PIN errado não avisa nada; o certo avisa que o alerta foi encerrado
        $this->actingAs($bia, 'sanctum')->postJson("/api/v1/rides/{$ride->id}/sos/cancel", ['emergencyPin' => '0000'])->assertStatus(422);
        $this->assertCount(2, $this->sms);
        $this->actingAs($bia, 'sanctum')->postJson("/api/v1/rides/{$ride->id}/sos/cancel", ['emergencyPin' => '2580'])->assertOk();
        $this->assertCount(4, $this->sms);
        $this->assertStringContainsString('Beatriz ((11) 91111-0001) desativou o alerta de emergência', $this->sms[2][1]);
    }

    public function test_passenger_without_a_name_is_identified_by_the_phone(): void
    {
        $u = $this->passenger();
        $u->forceFill(['name' => 'Usuário VOZTRI'])->save();
        $this->add($u, 'Maria', '11987654321')->assertCreated();
        $ride = $this->rideFor($u);

        $this->actingAs($u, 'sanctum')->postJson("/api/v1/rides/{$ride->id}/sos", ['latitude' => -23.56, 'longitude' => -46.65])->assertOk();
        $this->assertStringStartsWith('VOZTRI: Seu contato ((11) 91111-0001) acionou', $this->sms[0][1]);
    }

    public function test_sos_without_contacts_still_works_and_sends_nothing(): void
    {
        $bia = $this->passenger();
        $ride = $this->rideFor($bia);

        $this->actingAs($bia, 'sanctum')->postJson("/api/v1/rides/{$ride->id}/sos", ['latitude' => -23.56, 'longitude' => -46.65])
            ->assertOk()->assertJsonPath('trustedContactsNotified', 0);
        $this->actingAs($bia, 'sanctum')->postJson("/api/v1/rides/{$ride->id}/sos/cancel", ['emergencyPin' => '2580'])->assertOk();
        $this->assertSame([], $this->sms);
    }

    public function test_one_failing_contact_does_not_block_the_others(): void
    {
        $bia = $this->passenger();
        $this->add($bia, 'Maria', '11987654321')->assertCreated();
        $this->add($bia, 'João', '21998765432')->assertCreated();
        $ride = $this->rideFor($bia);
        $sent = [];
        $this->app->instance(SmsSender::class, new class($sent) implements SmsSender {
            public function __construct(private array &$sent) {}

            public function send(string $phone, string $text): bool
            {
                if ($phone === '11987654321') {
                    throw new \RuntimeException('Operadora fora do ar');
                }
                $this->sent[] = $phone;

                return true;
            }

            public function isEnabled(): bool
            {
                return true;
            }
        });

        $this->actingAs($bia, 'sanctum')->postJson("/api/v1/rides/{$ride->id}/sos", ['latitude' => -23.56, 'longitude' => -46.65])->assertOk();
        $this->assertSame(['21998765432'], $sent);
    }

    public function test_contacts_are_erased_with_the_account(): void
    {
        $bia = $this->passenger();
        $this->add($bia, 'Maria', '11987654321')->assertCreated();
        $this->actingAs($bia, 'sanctum')->deleteJson('/api/v1/auth/account', ['confirmation' => 'EXCLUIR'])->assertOk();
        $this->assertSame(0, TrustedContact::count());
    }
}
