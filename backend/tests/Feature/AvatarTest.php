<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\Passenger;
use App\Models\Ride;
use App\Models\User;
use App\Services\AvatarService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AvatarTest extends TestCase
{
    use RefreshDatabase;

    /** 300 × 200, metade esquerda vermelha e direita azul; EXIF com Orientation=6 e GPS. */
    private const EXIF_GPS_FIXTURE = __DIR__ . '/../fixtures/avatar-exif-gps.jpg';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(AvatarService::DISK);
    }

    private function user(string $phone, string $role = 'passenger'): User
    {
        $user = User::create(['name' => "Usuário {$phone}", 'phone' => $phone, 'role' => $role, 'status' => 'active']);
        if ($role === 'passenger') {
            Passenger::create(['user_id' => $user->id]);
        }

        return $user;
    }

    private function upload(User $u, UploadedFile $file)
    {
        return $this->actingAs($u, 'sanctum')->post('/api/v1/auth/avatar', ['photo' => $file], ['Accept' => 'application/json']);
    }

    private function storedImage(User $u): \GdImage
    {
        return imagecreatefromstring(Storage::disk(AvatarService::DISK)->get($u->fresh()->avatar_path));
    }

    private function rgb(\GdImage $img, int $x, int $y): array
    {
        $c = imagecolorat($img, $x, $y);

        return [($c >> 16) & 0xFF, ($c >> 8) & 0xFF, $c & 0xFF];
    }

    public function test_upload_stores_a_512px_jpeg_and_profile_points_to_the_api(): void
    {
        $u = $this->user('11911110001');

        $res = $this->upload($u, UploadedFile::fake()->image('foto.png', 1200, 900))->assertOk();

        $path = $u->fresh()->avatar_path;
        $this->assertStringStartsWith("avatars/{$u->id}/", $path);
        Storage::disk(AvatarService::DISK)->assertExists($path);
        [$w, $h, $type] = getimagesizefromstring(Storage::disk(AvatarService::DISK)->get($path));
        $this->assertSame([512, 512, IMAGETYPE_JPEG], [$w, $h, $type]);

        $url = $res->json('avatarUrl');
        $this->assertMatchesRegularExpression("#^/api/v1/users/{$u->id}/avatar\\?v=[0-9a-f]{10}$#", $url);
        $this->actingAs($u, 'sanctum')->getJson('/api/v1/auth/me')
            ->assertJsonPath('avatar_url', $url)->assertJsonMissingPath('avatar_path');
    }

    public function test_exif_orientation_is_applied_and_gps_location_is_removed(): void
    {
        $this->assertNotEmpty(exif_read_data(self::EXIF_GPS_FIXTURE, 'GPS', true)['GPS'] ?? [], 'A foto de teste tem GPS.');
        $u = $this->user('11911110001');

        $this->upload($u, new UploadedFile(self::EXIF_GPS_FIXTURE, 'foto.jpg', 'image/jpeg', null, true))->assertOk();

        $bytes = Storage::disk(AvatarService::DISK)->get($u->fresh()->avatar_path);
        $this->assertStringNotContainsString('Exif', $bytes, 'Nada de EXIF (e do GPS) no arquivo guardado.');
        $tmp = tempnam(sys_get_temp_dir(), 'av');
        file_put_contents($tmp, $bytes);
        $this->assertEmpty(@exif_read_data($tmp, 'GPS') ?: []);
        unlink($tmp);

        // Orientation=6 gira 90° no sentido horário: o vermelho (esquerda) vai para cima
        $img = $this->storedImage($u);
        [$r, , $b] = $this->rgb($img, 128, 40);
        $this->assertTrue($r > 150 && $b < 80, 'Em cima, vermelho.');
        [$r, , $b] = $this->rgb($img, 128, 470);
        $this->assertTrue($b > 150 && $r < 80, 'Embaixo, azul.');
    }

    public function test_new_photo_replaces_and_deletes_the_old_one_and_remove_clears_it(): void
    {
        $u = $this->user('11911110001');
        $this->upload($u, UploadedFile::fake()->image('a.jpg', 600, 600))->assertOk();
        $first = $u->fresh()->avatar_path;
        $firstUrl = $u->fresh()->avatarUrl();

        $this->upload($u, UploadedFile::fake()->image('b.jpg', 600, 600))->assertOk();
        $second = $u->fresh()->avatar_path;
        $this->assertNotSame($first, $second);
        $this->assertNotSame($firstUrl, $u->fresh()->avatarUrl(), 'O ?v= muda (cache do app).');
        Storage::disk(AvatarService::DISK)->assertMissing($first);

        $this->actingAs($u, 'sanctum')->deleteJson('/api/v1/auth/avatar')->assertOk()->assertExactJson(['avatarUrl' => null]);
        Storage::disk(AvatarService::DISK)->assertMissing($second);
        $this->assertNull($u->fresh()->avatar_path);
        $this->actingAs($u, 'sanctum')->deleteJson('/api/v1/auth/avatar')->assertOk(); // idempotente
    }

    public function test_invalid_files_are_rejected_in_portuguese(): void
    {
        $u = $this->user('11911110001');

        $this->actingAs($u, 'sanctum')->postJson('/api/v1/auth/avatar', [])
            ->assertStatus(422)->assertJsonPath('errors.photo.0', 'Escolha uma foto.');
        $this->upload($u, UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'))
            ->assertStatus(422)->assertJsonPath('errors.photo.0', 'A foto precisa ser JPEG ou PNG.');
        $this->upload($u, UploadedFile::fake()->image('grande.jpg', 800, 800)->size(3000))
            ->assertStatus(422)->assertJsonPath('errors.photo.0', 'A foto pode ter no máximo 2 MB.');
        $this->upload($u, UploadedFile::fake()->image('mini.jpg', 64, 64))
            ->assertStatus(422)->assertJsonPath('errors.photo.0', 'A foto precisa ter pelo menos 128 × 128 pixels.');
        $this->assertNull($u->fresh()->avatar_path);
    }

    public function test_photo_is_visible_to_owner_admin_and_ride_partner_only(): void
    {
        $this->getJson('/api/v1/users/' . \Illuminate\Support\Str::uuid() . '/avatar')->assertUnauthorized();

        $bia = $this->user('11911110001');
        $carlos = $this->user('11922220001', 'driver');
        $stranger = $this->user('11911110009');
        $admin = $this->user('11999990000', 'admin');
        $this->upload($bia, UploadedFile::fake()->image('a.jpg', 600, 600))->assertOk();
        $url = '/api/v1/users/' . $bia->id . '/avatar';

        $this->actingAs($bia, 'sanctum')->get($url)->assertOk()->assertHeader('Content-Type', 'image/jpeg')
            ->assertHeader('Cache-Control', 'max-age=86400, private');
        $this->actingAs($admin, 'sanctum')->get($url)->assertOk();
        $this->actingAs($stranger, 'sanctum')->getJson($url)->assertForbidden();
        $this->actingAs($carlos, 'sanctum')->getJson($url)->assertForbidden();

        // Corrida entre os dois: o motorista vê a foto da passageira (e o inverso)
        $driver = Driver::create([
            'user_id' => $carlos->id, 'cnh_number' => '12345678900', 'cnh_category' => 'B',
            'cnh_expires_at' => now()->addYear(), 'cnh_has_ear' => true, 'status' => 'approved', 'is_online' => true,
        ]);
        Ride::create([
            'passenger_id' => $bia->passenger->id, 'driver_id' => $driver->id, 'city_id' => \App\Models\City::create(['name' => 'São Paulo', 'state' => 'SP', 'is_active' => true])->id,
            'category' => 'pop', 'status' => 'COMPLETED', 'pickup_address' => 'A', 'dropoff_address' => 'B',
            'boarding_pin' => '1111', 'payment_method' => 'pix', 'payment_status' => 'pending',
            'estimated_price_cents' => 1000, 'final_price_cents' => 1000, 'distance_meters' => 1000, 'duration_seconds' => 300,
        ]);
        $this->actingAs($carlos, 'sanctum')->get($url)->assertOk();

        $this->upload($carlos, UploadedFile::fake()->image('c.jpg', 600, 600))->assertOk();
        $this->actingAs($bia, 'sanctum')->get('/api/v1/users/' . $carlos->id . '/avatar')->assertOk();
    }

    public function test_missing_photo_is_404_and_external_seed_url_is_kept(): void
    {
        $u = $this->user('11911110001');
        $this->actingAs($u, 'sanctum')->getJson('/api/v1/users/' . $u->id . '/avatar')->assertNotFound();

        $u->forceFill(['avatar_url' => 'https://images.exemplo.com/bia.jpg'])->save();
        $this->actingAs($u, 'sanctum')->getJson('/api/v1/auth/me')->assertJsonPath('avatar_url', 'https://images.exemplo.com/bia.jpg');
    }

    public function test_photos_are_deleted_with_the_account(): void
    {
        $u = $this->user('11911110001');
        $this->upload($u, UploadedFile::fake()->image('a.jpg', 600, 600))->assertOk();
        $path = $u->fresh()->avatar_path;

        $u->delete();

        Storage::disk(AvatarService::DISK)->assertMissing($path);
    }
}
