<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\City;
use App\Models\Driver;
use App\Models\DriverDocument;
use App\Models\FinancialLedger;
use App\Models\Passenger;
use App\Models\RecentDestination;
use App\Models\Ride;
use App\Models\RideChatMessage;
use App\Models\SavedPlace;
use App\Models\TrustedContact;
use App\Models\User;
use App\Models\UserDevice;
use App\Services\AccountDeletionService;
use App\Services\AvatarService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class AccountDeletionTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/auth/account';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(AvatarService::DISK);
    }

    private function passenger(string $phone = '11911110001'): User
    {
        $user = User::create(['name' => 'Beatriz Souza', 'phone' => $phone, 'email' => 'bia@exemplo.com', 'cpf' => '12345678909', 'role' => 'passenger', 'status' => 'active']);
        Passenger::create(['user_id' => $user->id, 'emergency_pin' => '2580']);

        return $user;
    }

    private function driver(string $phone = '11922220001'): User
    {
        $user = User::create(['name' => 'Carlos Lima', 'phone' => $phone, 'role' => 'driver', 'status' => 'active']);
        Driver::create([
            'user_id' => $user->id, 'cnh_number' => '12345678900', 'cnh_category' => 'B',
            'cnh_expires_at' => now()->addYear(), 'cnh_has_ear' => true, 'status' => 'approved', 'is_online' => true,
            'current_latitude' => -23.55, 'current_longitude' => -46.63, 'pix_key' => 'carlos@pix.com', 'pix_key_type' => 'email',
        ]);

        return $user;
    }

    private function ride(User $passenger, User $driver, string $status = 'COMPLETED'): Ride
    {
        return Ride::create([
            'passenger_id' => $passenger->passenger->id, 'driver_id' => $driver->driver->id,
            'city_id' => City::firstOrCreate(['name' => 'São Paulo', 'state' => 'SP'], ['is_active' => true])->id,
            'category' => 'pop', 'status' => $status, 'pickup_address' => 'A', 'dropoff_address' => 'B',
            'boarding_pin' => '1111', 'payment_method' => 'pix', 'payment_status' => 'pending',
            'estimated_price_cents' => 1000, 'final_price_cents' => 1000, 'distance_meters' => 1000, 'duration_seconds' => 300,
        ]);
    }

    private function destroy(User $u, array $body = ['confirmation' => 'EXCLUIR'])
    {
        return $this->actingAs($u, 'sanctum')->deleteJson(self::URL, $body);
    }

    public function test_requires_login_and_the_confirmation_word(): void
    {
        $this->deleteJson(self::URL, ['confirmation' => 'EXCLUIR'])->assertUnauthorized();

        $u = $this->passenger();
        $this->destroy($u, [])->assertStatus(422)->assertJsonPath('errors.confirmation.0', 'Digite EXCLUIR para confirmar.');
        $this->destroy($u, ['confirmation' => 'excluir'])->assertStatus(422);
        $this->assertNotNull($u->fresh(), 'Nada foi apagado.');
    }

    public function test_passenger_personal_data_is_erased_and_rides_are_kept_anonymous(): void
    {
        $bia = $this->passenger();
        $carlos = $this->driver();
        $ride = $this->ride($bia, $carlos);
        $passenger = $bia->passenger;
        TrustedContact::create(['passenger_id' => $passenger->id, 'name' => 'Mãe', 'phone' => '11988887777']);
        SavedPlace::create(['user_id' => $bia->id, 'kind' => 'home', 'address' => 'Rua A, 1', 'short_address' => 'Rua A, 1', 'latitude' => -23.5, 'longitude' => -46.6]);
        RecentDestination::create(['user_id' => $bia->id, 'address' => 'Rua B, 2', 'short_address' => 'Rua B, 2', 'latitude' => -23.5, 'longitude' => -46.6, 'used_at' => now()]);
        UserDevice::create(['user_id' => $bia->id, 'platform' => 'android', 'fcm_token' => 'tok-bia']);
        RideChatMessage::create(['ride_id' => $ride->id, 'sender_id' => $bia->id, 'sender_role' => 'passenger', 'message' => 'Estou no portão azul']);
        $this->actingAs($bia, 'sanctum')->post('/api/v1/auth/avatar', ['photo' => UploadedFile::fake()->image('a.jpg', 600, 600)], ['Accept' => 'application/json'])->assertOk();
        $token = $bia->createToken('app')->plainTextToken;

        $this->destroy($bia)->assertOk()->assertJsonPath('message', 'Sua conta foi excluída.');

        $gone = User::withTrashed()->find($bia->id);
        $this->assertTrue($gone->trashed());
        $this->assertSame(AccountDeletionService::DELETED_NAME, $gone->name);
        $this->assertSame('deleted', $gone->status);
        $this->assertStringStartsWith('deleted-', $gone->phone);
        $this->assertNull($gone->email);
        $this->assertNull($gone->cpf);
        $this->assertNull($gone->avatar_path);
        $this->assertNull($passenger->fresh()->emergency_pin);
        $this->assertSame(0, TrustedContact::where('passenger_id', $passenger->id)->count());
        $this->assertSame(0, SavedPlace::where('user_id', $bia->id)->count());
        $this->assertSame(0, RecentDestination::where('user_id', $bia->id)->count());
        $this->assertSame(0, UserDevice::where('user_id', $bia->id)->count());
        $this->assertSame(0, RideChatMessage::where('sender_id', $bia->id)->count());
        $this->assertSame([], Storage::disk(AvatarService::DISK)->allFiles('avatars/' . $bia->id));
        $this->assertSame(0, $gone->tokens()->count(), 'Todas as sessões encerradas.');
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();

        // A corrida continua (registro fiscal) e o motorista vê "Conta excluída"
        $this->assertNotNull($ride->fresh());
        $this->actingAs($carlos, 'sanctum')->getJson('/api/v1/rides/' . $ride->id)->assertOk()
            ->assertJsonPath('passenger.user.name', 'Conta excluída')
            ->assertJsonPath('passenger.user.avatarUrl', null);

        // Sem telefone, sem nome: só o registro de que a conta foi excluída
        $log = AuditLog::where('action', 'account_deleted')->sole();
        $this->assertSame($bia->id, $log->target_id);
        $this->assertStringNotContainsString('11911110001', json_encode($log->toArray()));
    }

    public function test_same_phone_can_sign_up_again_as_a_new_account(): void
    {
        $bia = $this->passenger();
        $this->destroy($bia)->assertOk();

        $this->postJson('/api/v1/auth/request-otp', ['phone' => '11911110001'])->assertOk();
        $fresh = User::where('phone', '11911110001')->sole();
        $this->assertNotSame($bia->id, $fresh->id);
        $this->assertSame('Usuário VOZTRI', $fresh->name);
        $this->assertFalse($fresh->passenger->hasEmergencyPin(), 'Conta nova, sem o PIN antigo.');
    }

    public function test_driver_data_is_erased_and_ledger_is_kept(): void
    {
        $carlos = $this->driver();
        $driver = $carlos->driver;
        DriverDocument::create(['driver_id' => $driver->id, 'type' => 'cnh', 'document_url' => 'docs/cnh.jpg']);
        FinancialLedger::create([
            'reference_id' => Str::uuid(), 'reference_type' => 'ride', 'account_type' => 'driver_balance', 'account_id' => $driver->id,
            'entry_type' => 'credit', 'amount_cents' => 800, 'balance_after_cents' => 800, 'description' => 'Corrida', 'created_at' => now(),
        ]);

        $this->destroy($carlos)->assertOk();

        $driver->refresh();
        $this->assertSame('deleted', $driver->status);
        $this->assertFalse($driver->is_online, 'Sai do mapa e das ofertas.');
        $this->assertNull($driver->current_latitude);
        $this->assertNull($driver->pix_key);
        $this->assertSame('', $driver->cnh_number);
        $this->assertSame(0, DriverDocument::where('driver_id', $driver->id)->count());
        $this->assertSame(1, FinancialLedger::where('account_id', $driver->id)->count(), 'O ledger fica (registro contábil).');
    }

    public function test_blocked_while_a_ride_is_open_for_passenger_or_driver(): void
    {
        $bia = $this->passenger();
        $carlos = $this->driver();
        $ride = $this->ride($bia, $carlos, 'DRIVER_EN_ROUTE');

        $this->destroy($bia)->assertStatus(409)->assertJsonPath('error', 'RIDE_IN_PROGRESS');
        $this->destroy($carlos)->assertStatus(409)->assertJsonPath('error', 'RIDE_IN_PROGRESS');
        $this->assertFalse($bia->fresh()->trashed());

        $ride->update(['status' => 'CANCELLED']);
        $this->destroy($carlos)->assertOk();
    }

    public function test_admin_cannot_delete_itself_through_the_app_and_admin_lists_skip_deleted(): void
    {
        $admin = User::create(['name' => 'Admin', 'phone' => '11999990000', 'role' => 'admin', 'status' => 'active']);
        $this->destroy($admin)->assertForbidden();

        $carlos = $this->driver();
        $this->driver('11922220002');
        $this->destroy($carlos)->assertOk();

        $this->app['auth']->forgetGuards();
        $this->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/stats')->assertJsonPath('drivers_count', 1);
        $this->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/drivers')->assertJsonPath('total', 1);
    }
}
