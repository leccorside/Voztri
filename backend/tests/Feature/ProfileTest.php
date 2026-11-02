<?php

namespace Tests\Feature;

use App\Models\Passenger;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private function passenger(string $phone = '11911110001', ?string $email = null): User
    {
        $user = User::create(['name' => 'Beatriz', 'phone' => $phone, 'email' => $email, 'role' => 'passenger', 'status' => 'active']);
        Passenger::create(['user_id' => $user->id]);

        return $user;
    }

    private function update(User $u, array $body)
    {
        return $this->actingAs($u, 'sanctum')->putJson('/api/v1/auth/profile', $body);
    }

    public function test_updates_name_and_email_and_answers_in_the_login_format(): void
    {
        $u = $this->passenger();

        $this->update($u, ['name' => '  Beatriz   Lima  ', 'email' => ' Beatriz@Exemplo.COM '])
            ->assertOk()
            ->assertJsonPath('message', 'Perfil atualizado com sucesso.')
            ->assertJsonPath('user.name', 'Beatriz Lima')
            ->assertJsonPath('user.email', 'beatriz@exemplo.com')
            ->assertJsonPath('user.phone', '11911110001')
            ->assertJsonPath('user.role', 'passenger')
            ->assertJsonPath('user.has_emergency_pin', false)
            ->assertJsonMissingPath('user.otp_code');

        $this->actingAs($u, 'sanctum')->getJson('/api/v1/auth/me')
            ->assertJsonPath('name', 'Beatriz Lima')->assertJsonPath('email', 'beatriz@exemplo.com');
    }

    public function test_only_sent_fields_change_and_email_can_be_removed(): void
    {
        $u = $this->passenger('11911110001', 'bia@exemplo.com');

        $this->update($u, ['name' => 'Bia'])->assertOk()->assertJsonPath('user.email', 'bia@exemplo.com');
        $this->update($u, ['email' => ''])->assertOk()->assertJsonPath('user.email', null)->assertJsonPath('user.name', 'Bia');
        $this->update($u, ['email' => 'bia@exemplo.com'])->assertOk();
        $this->update($u, ['email' => null])->assertOk()->assertJsonPath('user.email', null);
    }

    public function test_validation_messages_in_portuguese(): void
    {
        $u = $this->passenger();
        $this->passenger('11911110002', 'ocupado@exemplo.com');

        $this->update($u, ['name' => '   '])->assertStatus(422)->assertJsonPath('errors.name.0', 'Informe seu nome.');
        $this->update($u, ['name' => 'B'])->assertStatus(422)->assertJsonPath('errors.name.0', 'O nome precisa ter pelo menos 2 letras.');
        $this->update($u, ['name' => str_repeat('a', 101)])->assertStatus(422)->assertJsonValidationErrors(['name']);
        $this->update($u, ['email' => 'nao-e-email'])->assertStatus(422)->assertJsonPath('errors.email.0', 'Informe um e-mail válido.');
        $this->update($u, ['email' => 'OCUPADO@exemplo.com'])->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Este e-mail já está em uso por outra conta.');

        $this->assertSame('Beatriz', $u->fresh()->name, 'Nada mudou com os pedidos inválidos.');
    }

    public function test_keeping_its_own_email_is_not_a_conflict(): void
    {
        $u = $this->passenger('11911110001', 'bia@exemplo.com');
        $this->update($u, ['name' => 'Beatriz Lima', 'email' => 'bia@exemplo.com'])->assertOk();
    }

    public function test_phone_role_and_status_cannot_be_changed_here(): void
    {
        $u = $this->passenger();

        $this->update($u, ['name' => 'Bia', 'phone' => '11900000000', 'role' => 'admin', 'status' => 'blocked'])->assertOk();

        $fresh = $u->fresh();
        $this->assertSame(['11911110001', 'passenger', 'active'], [$fresh->phone, $fresh->role, $fresh->status]);
    }

    public function test_drivers_use_it_too_and_login_is_required(): void
    {
        $this->putJson('/api/v1/auth/profile', ['name' => 'X'])->assertUnauthorized();

        $driver = User::create(['name' => 'Carlos', 'phone' => '11922220001', 'role' => 'driver', 'status' => 'active']);
        $this->update($driver, ['name' => 'Carlos Eduardo'])->assertOk()
            ->assertJsonPath('user.name', 'Carlos Eduardo')
            ->assertJsonMissingPath('user.has_emergency_pin');
    }
}
