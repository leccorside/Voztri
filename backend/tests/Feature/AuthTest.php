<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;

class AuthTest extends TestCase
{
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
