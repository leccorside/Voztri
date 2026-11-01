<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin Teste',
            'phone' => '11999997777',
            'email' => 'admin.teste@voztri.com.br',
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    public function test_audit_logs_endpoint_returns_operator_when_logs_exist(): void
    {
        $admin = $this->admin();
        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'driver_approval',
            'target_entity' => 'drivers',
            'ip_address' => '127.0.0.1',
            'new_values' => ['status' => 'approved'],
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/audit-logs')
            ->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.action', 'driver_approval')
            ->assertJsonPath('data.0.user.email', 'admin.teste@voztri.com.br');
    }

    // ---- Login exclusivo do painel (/auth/admin/*) ----------------------------

    public function test_admin_request_otp_with_unknown_phone_does_not_create_any_record(): void
    {
        $this->postJson('/api/v1/auth/admin/request-otp', ['phone' => '(11) 98765-4321'])
            ->assertStatus(200)
            ->assertJsonPath('debug_otp', null)
            ->assertJsonStructure(['message', 'expires_in_seconds']);

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('passengers', 0);
        $this->assertDatabaseCount('user_profiles', 0);
    }

    public function test_admin_request_otp_does_not_issue_code_to_non_admin(): void
    {
        $passenger = User::create([
            'name' => 'Passageiro Teste',
            'phone' => '11999998888',
            'role' => 'passenger',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/auth/admin/request-otp', ['phone' => '11999998888'])
            ->assertStatus(200)
            ->assertJsonPath('debug_otp', null);

        // Mesma mensagem do caso de admin: não revela se o telefone é de um administrador
        $this->assertSame(
            'Se o telefone pertencer a um administrador, o código de verificação foi enviado.',
            $response->json('message'),
        );
        $this->assertNull($passenger->fresh()->otp_code);
        $this->assertDatabaseMissing('passengers', ['user_id' => $passenger->id]);
    }

    public function test_admin_request_otp_does_not_issue_code_to_inactive_admin(): void
    {
        $admin = $this->admin();
        $admin->update(['status' => 'suspended']);

        $this->postJson('/api/v1/auth/admin/request-otp', ['phone' => '11999997777'])
            ->assertStatus(200)
            ->assertJsonPath('debug_otp', null);

        $this->assertNull($admin->fresh()->otp_code);
    }

    public function test_admin_can_login_through_admin_otp_flow(): void
    {
        $admin = $this->admin();

        $this->postJson('/api/v1/auth/admin/request-otp', ['phone' => '(11) 99999-7777'])
            ->assertStatus(200)
            ->assertJsonPath('debug_otp', '123456');

        $token = $this->postJson('/api/v1/auth/admin/verify-otp', ['phone' => '11999997777', 'code' => '123456'])
            ->assertStatus(200)
            ->assertJsonPath('user.id', $admin->id)
            ->assertJsonPath('user.role', 'admin')
            ->json('token');

        $this->assertNotEmpty($token);
        $this->assertNull($admin->fresh()->otp_code, 'O código usado deve ser invalidado.');
        $this->assertDatabaseCount('passengers', 0);

        // O token emitido dá acesso às rotas do painel
        $this->withToken($token)->getJson('/api/v1/admin/stats')->assertStatus(200);
    }

    public function test_admin_verify_otp_rejects_non_admin_even_with_valid_public_otp(): void
    {
        // Passageiro obtém um OTP válido pelo fluxo público...
        $this->postJson('/api/v1/auth/request-otp', ['phone' => '11999991234'])->assertStatus(200);

        // ...mas o endpoint do painel não emite token para ele
        $this->postJson('/api/v1/auth/admin/verify-otp', ['phone' => '11999991234', 'code' => '123456'])
            ->assertStatus(422)
            ->assertJsonPath('error', 'INVALID_OTP')
            ->assertJsonMissingPath('token');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_admin_verify_otp_rejects_wrong_code(): void
    {
        $this->admin();
        $this->postJson('/api/v1/auth/admin/request-otp', ['phone' => '11999997777'])->assertStatus(200);

        $this->postJson('/api/v1/auth/admin/verify-otp', ['phone' => '11999997777', 'code' => '000000'])
            ->assertStatus(422)
            ->assertJsonPath('error', 'INVALID_OTP');
    }

    public function test_admin_otp_endpoints_are_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/admin/request-otp', ['phone' => '11900000000'])->assertStatus(200);
        }

        $this->postJson('/api/v1/auth/admin/request-otp', ['phone' => '11900000000'])->assertStatus(429);
    }

    public function test_admin_routes_reject_non_admin_users(): void
    {
        $passenger = User::create([
            'name' => 'Passageiro Teste',
            'phone' => '11999998888',
            'role' => 'passenger',
            'status' => 'active',
        ]);

        $this->actingAs($passenger, 'sanctum')
            ->getJson('/api/v1/admin/stats')
            ->assertStatus(403);
    }
}
