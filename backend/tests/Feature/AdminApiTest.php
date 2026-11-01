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
