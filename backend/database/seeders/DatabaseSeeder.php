<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Passenger;
use App\Models\Driver;
use App\Models\DriverVehicle;
use App\Models\City;
use App\Models\FareRule;
use Carbon\Carbon;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Cria Cidade Inicial (São Paulo) e Regras Tarifárias
        $city = City::create([
            'id' => Str::uuid(),
            'name' => 'São Paulo',
            'state' => 'SP',
            'is_active' => true,
        ]);

        $categories = [
            ['cat' => 'pop', 'base' => 500, 'km' => 220, 'min' => 30, 'minimum' => 750],
            ['cat' => 'black', 'base' => 900, 'km' => 340, 'min' => 50, 'minimum' => 1400],
            ['cat' => 'mulher', 'base' => 550, 'km' => 230, 'min' => 32, 'minimum' => 800],
            ['cat' => 'moto', 'base' => 350, 'km' => 140, 'min' => 20, 'minimum' => 500],
        ];

        foreach ($categories as $c) {
            FareRule::create([
                'id' => Str::uuid(),
                'city_id' => $city->id,
                'vehicle_category' => $c['cat'],
                'base_fare_cents' => $c['base'],
                'price_per_km_cents' => $c['km'],
                'price_per_minute_cents' => $c['min'],
                'minimum_fare_cents' => $c['minimum'],
                'platform_commission_percent' => 15.00,
            ]);
        }

        // 2. Administrador Master
        $admin = User::create([
            'id' => Str::uuid(),
            'name' => 'Administrador VOZTRI',
            'phone' => '11999990000',
            'email' => 'admin@voztri.com.br',
            'cpf' => '000.000.000-01',
            'role' => 'admin',
            'status' => 'active',
        ]);
        UserProfile::create(['user_id' => $admin->id, 'rating_avg' => 5.0, 'total_ratings' => 100]);

        // 3. Passageiro Padrão
        $passengerUser = User::create([
            'id' => Str::uuid(),
            'name' => 'Beatriz Lima',
            'phone' => '11999991111',
            'email' => 'beatriz@voztri.com.br',
            'cpf' => '111.222.333-44',
            'avatar_url' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            'role' => 'passenger',
            'status' => 'active',
        ]);
        UserProfile::create(['user_id' => $passengerUser->id, 'rating_avg' => 4.95, 'total_ratings' => 38]);
        // Sem PIN de emergência: o app pede para a passageira definir o dela no primeiro acesso
        Passenger::create(['id' => Str::uuid(), 'user_id' => $passengerUser->id]);

        // 4. Motorista Homologado e Online
        $driverUser = User::create([
            'id' => Str::uuid(),
            'name' => 'Carlos Eduardo Silva',
            'phone' => '11999992222',
            'email' => 'carlos.motorista@voztri.com.br',
            'cpf' => '222.333.444-55',
            'avatar_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
            'role' => 'driver',
            'status' => 'active',
        ]);
        UserProfile::create(['user_id' => $driverUser->id, 'rating_avg' => 4.98, 'total_ratings' => 1420]);
        
        $driver = Driver::create([
            'id' => Str::uuid(),
            'user_id' => $driverUser->id,
            'cnh_number' => '12345678900',
            'cnh_category' => 'B',
            'cnh_expires_at' => Carbon::now()->addYears(4),
            'cnh_has_ear' => true,
            'status' => 'approved',
            'is_online' => true,
            'current_latitude' => -23.550520,
            'current_longitude' => -46.633308,
            'last_location_at' => Carbon::now(),
            'pix_key' => 'carlos.motorista@voztri.com.br',
            'pix_key_type' => 'email',
        ]);

        DriverVehicle::create([
            'id' => Str::uuid(),
            'driver_id' => $driver->id,
            'brand' => 'Toyota',
            'model' => 'Corolla XEi',
            'year' => 2022,
            'color' => 'Prata Metálico',
            'plate' => 'VOZ2026',
            'renavam' => '12345678901',
            'category' => 'pop',
            'is_active' => true,
        ]);
    }
}

