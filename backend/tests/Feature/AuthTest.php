<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AuthTest extends TestCase
{
    use RefreshDatabase;
    public function test_can_request_otp_code(): void
    {
        $response = $this->postJson('/api/v1/auth/request-otp', [
            'phone' => '11999993333',
            'role' => 'passenger',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'expires_in_seconds']);
    }

    public function test_can_verify_otp_and_receive_sanctum_token(): void
    {
        // Solicita
        $this->postJson('/api/v1/auth/request-otp', [
            'phone' => '11999994444',
            'role' => 'passenger',
        ]);

        // Valida
        $response = $this->postJson('/api/v1/auth/verify-otp', [
            'phone' => '11999994444',
            'code' => '123456',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'phone', 'role', 'status'],
            ]);
    }

    public function test_cannot_self_register_as_admin(): void
    {
        $response = $this->postJson('/api/v1/auth/request-otp', [
            'phone' => '11999995555',
            'role' => 'admin',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['role']);
        $this->assertDatabaseMissing('users', ['phone' => '11999995555']);
    }

    public function test_existing_admin_login_does_not_create_passenger_record(): void
    {
        $admin = User::create([
            'name' => 'Admin Teste',
            'phone' => '11999996666',
            'role' => 'admin',
            'status' => 'active',
        ]);

        // Sem "role" na requisição: o padrão "passenger" não pode ser aplicado a um admin
        $this->postJson('/api/v1/auth/request-otp', ['phone' => '11999996666'])->assertStatus(200);

        $this->assertDatabaseMissing('passengers', ['user_id' => $admin->id]);
        $this->assertSame('admin', $admin->fresh()->role);
    }

    public function test_health_check_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'healthy',
                'app' => 'VOZTRI Backend API',
            ]);
    }
}

