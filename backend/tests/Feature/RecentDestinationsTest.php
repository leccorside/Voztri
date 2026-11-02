<?php

namespace Tests\Feature;

use App\Jobs\PruneRecentDestinations;
use App\Models\Passenger;
use App\Models\RecentDestination;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Scheduling\CacheEventMutex;
use Illuminate\Console\Scheduling\CacheSchedulingMutex;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Cache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecentDestinationsTest extends TestCase
{
    use RefreshDatabase;

    private const ORIGIN = ['address' => 'Av. Paulista, 1578 - Bela Vista', 'latitude' => -23.561414, 'longitude' => -46.655881];

    private const FARIA_LIMA = [
        'address' => 'Avenida Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP',
        'shortAddress' => 'Pátio Victor Malzoni',
        'latitude' => -23.586447,
        'longitude' => -46.6819633,
        'city' => 'São Paulo',
        'state' => 'SP',
    ];

    private function passenger(string $phone = '11911110001'): User
    {
        $user = User::create(['name' => 'Beatriz', 'phone' => $phone, 'role' => 'passenger', 'status' => 'active']);
        Passenger::create(['user_id' => $user->id, 'emergency_pin' => '4321']);

        return $user;
    }

    /** Solicita a corrida e cancela em seguida (só pode haver uma em andamento). */
    private function rideTo(User $u, array $destination): void
    {
        $id = $this->actingAs($u, 'sanctum')->postJson('/api/v1/rides/request', [
            'origin' => self::ORIGIN,
            'destination' => $destination,
            'category' => 'pop',
            'paymentMethod' => 'pix',
        ])->assertCreated()->json('id');
        $this->actingAs($u, 'sanctum')->postJson("/api/v1/rides/{$id}/cancel", ['reason' => 'Teste'])->assertOk();
        $this->travel(1)->seconds();
    }

    private function place(string $short, float $lat, float $lng): array
    {
        return ['address' => "{$short} - Centro, São Paulo - SP", 'shortAddress' => $short, 'latitude' => $lat, 'longitude' => $lng];
    }

    public function test_requesting_a_ride_records_the_destination(): void
    {
        $u = $this->passenger();
        $this->actingAs($u, 'sanctum')->getJson('/api/v1/places/recent')->assertOk()->assertExactJson(['recent' => []]);

        $this->rideTo($u, self::FARIA_LIMA);

        $recent = $this->actingAs($u, 'sanctum')->getJson('/api/v1/places/recent')->assertOk()->json('recent');
        $this->assertCount(1, $recent);
        $this->assertIsString($recent[0]['id']);
        unset($recent[0]['id']);
        $this->assertEquals(self::FARIA_LIMA, $recent[0]);
    }

    public function test_most_recent_first_without_repeats_and_limited(): void
    {
        $u = $this->passenger();
        $this->rideTo($u, self::FARIA_LIMA);
        $this->rideTo($u, $this->place('Rua Augusta, 1500', -23.5565, -46.6586));
        // O mesmo prédio com outro nome, a ~20 m: sobe para o topo com o nome novo
        $this->rideTo($u, ['shortAddress' => 'Av. Faria Lima, 3477'] + self::FARIA_LIMA + ['latitude' => -23.5863, 'longitude' => -46.6818]);

        $recent = $this->actingAs($u, 'sanctum')->getJson('/api/v1/places/recent')->json('recent');
        $this->assertSame(['Av. Faria Lima, 3477', 'Rua Augusta, 1500'], array_column($recent, 'shortAddress'));

        foreach ([1, 2, 3, 4] as $i) {
            $this->rideTo($u, $this->place("Destino {$i}", -23.50 - $i / 100, -46.60));
        }
        $recent = $this->actingAs($u, 'sanctum')->getJson('/api/v1/places/recent')->json('recent');
        $this->assertSame(['Destino 4', 'Destino 3', 'Destino 2', 'Destino 1', 'Av. Faria Lima, 3477'], array_column($recent, 'shortAddress'));
        $this->assertSame(RecentDestination::LIMIT, RecentDestination::where('user_id', $u->id)->count(), 'Os mais antigos saem do banco.');
    }

    public function test_without_short_address_uses_the_street_part(): void
    {
        $u = $this->passenger();
        $this->rideTo($u, ['address' => 'Av. Faria Lima, 3477 - Itaim Bibi', 'latitude' => -23.585721, 'longitude' => -46.679199]);

        $this->actingAs($u, 'sanctum')->getJson('/api/v1/places/recent')
            ->assertJsonPath('recent.0.shortAddress', 'Av. Faria Lima, 3477')
            ->assertJsonMissingPath('recent.0.city');
    }

    public function test_remove_only_own_entries_and_access_rules(): void
    {
        $this->getJson('/api/v1/places/recent')->assertUnauthorized();

        $bia = $this->passenger();
        $ana = $this->passenger('11911110002');
        $this->rideTo($bia, self::FARIA_LIMA);
        $id = RecentDestination::where('user_id', $bia->id)->value('id');

        // Cada conta só vê e só remove os seus
        $this->actingAs($ana, 'sanctum')->getJson('/api/v1/places/recent')->assertExactJson(['recent' => []]);
        $this->actingAs($ana, 'sanctum')->deleteJson("/api/v1/places/recent/{$id}")->assertNoContent();
        $this->assertSame(1, RecentDestination::count());

        $this->actingAs($bia, 'sanctum')->deleteJson("/api/v1/places/recent/{$id}")->assertNoContent();
        $this->actingAs($bia, 'sanctum')->deleteJson("/api/v1/places/recent/{$id}")->assertNoContent(); // idempotente
        $this->assertSame(0, RecentDestination::count());
        $this->actingAs($bia, 'sanctum')->deleteJson('/api/v1/places/recent/nao-e-uuid')->assertNotFound();

        $driver = User::create(['name' => 'Carlos', 'phone' => '11922220001', 'role' => 'driver', 'status' => 'active']);
        $this->actingAs($driver, 'sanctum')->getJson('/api/v1/places/recent')->assertForbidden();
    }

    public function test_history_is_deleted_with_the_user(): void
    {
        $u = $this->passenger();
        $this->rideTo($u, self::FARIA_LIMA);

        $u->delete();

        $this->assertSame(0, RecentDestination::count());
    }

    public function test_clear_removes_the_whole_history_of_the_account_only(): void
    {
        $bia = $this->passenger();
        $ana = $this->passenger('11911110002');
        $this->rideTo($bia, self::FARIA_LIMA);
        $this->rideTo($bia, $this->place('Rua Augusta, 1500', -23.5565, -46.6586));
        $this->rideTo($ana, self::FARIA_LIMA);

        $this->actingAs($bia, 'sanctum')->deleteJson('/api/v1/places/recent')->assertNoContent();
        $this->actingAs($bia, 'sanctum')->deleteJson('/api/v1/places/recent')->assertNoContent(); // já vazio

        $this->actingAs($bia, 'sanctum')->getJson('/api/v1/places/recent')->assertExactJson(['recent' => []]);
        $this->assertSame(1, RecentDestination::where('user_id', $ana->id)->count(), 'O da Ana fica.');

        $driver = User::create(['name' => 'Carlos', 'phone' => '11922220001', 'role' => 'driver', 'status' => 'active']);
        $this->actingAs($driver, 'sanctum')->deleteJson('/api/v1/places/recent')->assertForbidden();
    }

    /** Destino gravado direto no banco, com o último uso há $days dias. */
    private function usedDaysAgo(User $u, string $short, int $days): RecentDestination
    {
        return RecentDestination::create([
            'user_id' => $u->id,
            'address' => "{$short} - Centro, São Paulo - SP",
            'short_address' => $short,
            'latitude' => -23.5 - $days / 1000,
            'longitude' => -46.6,
            'used_at' => now()->subDays($days),
        ]);
    }

    public function test_entries_older_than_90_days_are_hidden_and_pruned_by_the_job(): void
    {
        $bia = $this->passenger();
        $ana = $this->passenger('11911110002');
        $this->usedDaysAgo($bia, 'Recente', 1);
        $this->usedDaysAgo($bia, 'No limite', 89);
        $this->usedDaysAgo($bia, 'Vencido', 91);
        $this->usedDaysAgo($ana, 'Muito antigo', 400);

        // Antes do job, a API já não mostra os vencidos
        $recent = $this->actingAs($bia, 'sanctum')->getJson('/api/v1/places/recent')->json('recent');
        $this->assertSame(['Recente', 'No limite'], array_column($recent, 'shortAddress'));

        (new PruneRecentDestinations)->handle();

        $this->assertSame(['No limite', 'Recente'], RecentDestination::orderBy('used_at')->pluck('short_address')->all());
    }

    public function test_using_a_destination_again_restarts_the_retention_period(): void
    {
        $u = $this->passenger();
        $old = $this->usedDaysAgo($u, 'Av. Faria Lima, 3477', 89);

        // Mesmo lugar (a menos de 50 m): o último uso passa a ser agora
        $this->rideTo($u, ['address' => $old->address, 'shortAddress' => 'Av. Faria Lima, 3477', 'latitude' => $old->latitude, 'longitude' => $old->longitude]);
        $this->travel(5)->days();
        (new PruneRecentDestinations)->handle();

        $this->assertSame(1, RecentDestination::count());
    }

    private function pruneEvent(): Event
    {
        $event = collect(app(Schedule::class)->events())->first(fn ($e) => $e->description === 'prune-recent-destinations');
        $this->assertNotNull($event, 'Tarefa não agendada em routes/console.php.');

        return $event;
    }

    public function test_pruning_is_scheduled_daily_at_dawn_in_sao_paulo(): void
    {
        $event = $this->pruneEvent();

        $this->assertSame('30 3 * * *', $event->expression);
        $this->assertSame('America/Sao_Paulo', $event->timezone);
    }

    public function test_pruning_runs_on_one_server_without_overlapping_with_locks_in_redis(): void
    {
        $event = $this->pruneEvent();

        $this->assertTrue($event->onOneServer, 'Falta o onOneServer().');
        $this->assertTrue($event->withoutOverlapping, 'Falta o withoutOverlapping().');
        $this->assertSame(10, $event->expiresAt, 'A trava de sobreposição expira em 10 min.');

        // As duas travas usam o Redis, mesmo com o CACHE_STORE=array dos testes
        $this->assertInstanceOf(CacheEventMutex::class, $event->mutex);
        $this->assertSame('redis', $event->mutex->store);
        $scheduling = (new \ReflectionProperty(Schedule::class, 'schedulingMutex'))->getValue(app(Schedule::class));
        $this->assertInstanceOf(CacheSchedulingMutex::class, $scheduling);
        $this->assertSame('redis', $scheduling->store);
    }

    public function test_redis_locks_block_a_second_server_and_an_overlapping_run(): void
    {
        $event = $this->pruneEvent();
        $scheduling = (new \ReflectionProperty(Schedule::class, 'schedulingMutex'))->getValue(app(Schedule::class));
        // Horário fora do agendamento real (03:30), para não atrapalhar o scheduler do dev
        $tick = Carbon::create(2000, 1, 1, 12, 34, 0, 'America/Sao_Paulo');
        $redis = Cache::store('redis')->getStore();

        try {
            // onOneServer: o primeiro servidor pega o minuto; o segundo não dispara
            $this->assertTrue($scheduling->create($event, $tick));
            $this->assertFalse($scheduling->create($event, $tick));

            // withoutOverlapping: o disparo pega a trava (shouldSkipDueToOverlapping é o
            // que o agendador chama); com ele em andamento, o próximo é pulado
            $this->assertFalse($event->shouldSkipDueToOverlapping());
            $this->assertTrue($event->mutex->exists($event));
            $this->assertTrue($event->shouldSkipDueToOverlapping());
            // Terminado o disparo, a trava é solta e o próximo pode rodar
            $event->mutex->forget($event);
            $this->assertFalse($event->shouldSkipDueToOverlapping());
        } finally {
            $redis->lock($event->mutexName() . $tick->format('Hi'))->forceRelease();
            $event->mutex->forget($event);
        }
    }
}
