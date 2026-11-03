<?php

namespace Tests\Feature;

use App\Models\Passenger;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cada limite de requisições tem a sua contagem. Sem o prefixo no throttle, o Laravel
 * somava todas as rotas com limite numa contagem só por usuário: depois de 10 edições
 * do perfil, a troca do PIN de emergência e a exclusão da conta davam 429.
 */
class RateLimitIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_hitting_one_limit_does_not_block_other_routes(): void
    {
        $u = User::create(['name' => 'Beatriz Lima', 'phone' => '11911110001', 'role' => 'passenger', 'status' => 'active']);
        Passenger::create(['user_id' => $u->id]);

        foreach (range(1, 10) as $i) {
            $this->actingAs($u, 'sanctum')->putJson('/api/v1/auth/profile', ['name' => "Beatriz Lima {$i}"])->assertOk();
        }
        $this->actingAs($u, 'sanctum')->putJson('/api/v1/auth/profile', ['name' => 'Beatriz'])->assertStatus(429);

        // Outras rotas com limite seguem liberadas
        $this->actingAs($u, 'sanctum')->putJson('/api/v1/passenger/emergency-pin', ['pin' => '2580'])->assertOk();
        $this->actingAs($u, 'sanctum')->postJson('/api/v1/passenger/trusted-contacts', ['name' => 'Maria', 'phone' => '11987654321'])->assertCreated();
        $this->actingAs($u, 'sanctum')->deleteJson('/api/v1/auth/account', ['confirmation' => 'EXCLUIR'])->assertOk();
    }
}
