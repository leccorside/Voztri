# Modelo do Banco de Dados Relacional & Geoespacial (PostgreSQL + PostGIS)

## 1. Visão Geral
O banco de dados utiliza PostgreSQL 16 com extensão PostGIS 3.4 para cálculos geodésicos exatos no elipsoide WGS84 (SRID 4326), utilizando índices espaciais GiST para busca de vizinhança e polígonos com alta performance.

## 2. Tabelas Principais e Esquemas

### Autenticação & Usuários
- `users`: `id (UUID PK)`, `phone (VARCHAR 20 UNIQUE)`, `email (VARCHAR 100 UNIQUE)`, `name (VARCHAR 100)`, `cpf (VARCHAR 14 UNIQUE)`, `avatar_url`, `password_hash`, `role (ENUM: passenger, driver, admin)`, `status (ENUM: pending, active, suspended, blocked)`, `created_at`, `updated_at`, `deleted_at`.
- `user_profiles`: `id (UUID PK)`, `user_id (UUID FK)`, `birth_date (DATE)`, `gender`, `rating_avg (DECIMAL 3,2)`, `total_ratings (INT)`.
- `user_devices`: `id (UUID PK)`, `user_id (UUID FK)`, `platform (ENUM: android, ios, web)`, `fcm_token (TEXT)`, `device_id (VARCHAR 100)`, `last_active_at`.

### Passageiros & Motoristas
- `passengers`: `id (UUID PK)`, `user_id (UUID FK)`, `emergency_pin (VARCHAR 6)`.
- `trusted_contacts`: `id (UUID PK)`, `passenger_id (UUID FK)`, `name (VARCHAR 100)`, `phone (VARCHAR 20)`, `notify_on_trip (BOOLEAN)`.
- `drivers`: `id (UUID PK)`, `user_id (UUID FK)`, `cnh_number (VARCHAR 20)`, `cnh_category (VARCHAR 5)`, `cnh_expires_at (DATE)`, `cnh_has_ear (BOOLEAN)`, `status (ENUM: pending_approval, approved, rejected, blocked)`, `is_online (BOOLEAN)`, `current_latitude (DOUBLE)`, `current_longitude (DOUBLE)`, `last_location_at (TIMESTAMP)`.
- `driver_documents`: `id (UUID PK)`, `driver_id (UUID FK)`, `type (ENUM: cnh, crlv, background_check, photo)`, `document_url (TEXT)`, `status (ENUM: pending, approved, rejected)`, `rejection_reason (TEXT)`.
- `driver_vehicles`: `id (UUID PK)`, `driver_id (UUID FK)`, `brand`, `model`, `year (INT)`, `color`, `plate (VARCHAR 10)`, `renavam (VARCHAR 20)`, `category (ENUM: pop, black, mulher, moto)`, `is_active (BOOLEAN)`.

### Cidades & Geofencing
- `cities`: `id (UUID PK)`, `name`, `state (VARCHAR 2)`, `is_active (BOOLEAN)`, `center_point (GEOMETRY(Point, 4326))`.
- `service_areas`: `id (UUID PK)`, `city_id (UUID FK)`, `name`, `polygon (GEOMETRY(Polygon, 4326))`, `is_active (BOOLEAN)`.
- `fare_rules`: `id (UUID PK)`, `city_id (UUID FK)`, `vehicle_category`, `base_fare (INT, centavos)`, `price_per_km (INT, centavos)`, `price_per_minute (INT, centavos)`, `minimum_fare (INT, centavos)`, `platform_commission_percent (DECIMAL 5,2)`.

### Corridas & Despacho
- `rides`: `id (UUID PK)`, `passenger_id (UUID FK)`, `driver_id (UUID FK NULLABLE)`, `city_id (UUID FK)`, `category`, `status (ENUM: requested, searching, offered, accepted, driver_en_route, driver_arrived, in_progress, completed, cancelled, no_driver_available)`, `pickup_address (TEXT)`, `pickup_location (GEOMETRY(Point, 4326))`, `dropoff_address (TEXT)`, `dropoff_location (GEOMETRY(Point, 4326))`, `distance_meters (INT)`, `duration_seconds (INT)`, `boarding_pin (VARCHAR 4)`, `estimated_price (INT, centavos)`, `final_price (INT, centavos)`, `payment_method (ENUM: pix, credit_card, cash, wallet)`, `payment_status (ENUM: pending, authorized, paid, failed, refunded)`, `route_polyline (TEXT)`, `started_at`, `completed_at`, `created_at`.
- `ride_offers`: `id (UUID PK)`, `ride_id (UUID FK)`, `driver_id (UUID FK)`, `radius_km (INT)`, `status (ENUM: sent, accepted, rejected, expired)`, `expires_at (TIMESTAMP)`.
- `ride_status_history`: `id (UUID PK)`, `ride_id (UUID FK)`, `from_status`, `to_status`, `triggered_by (UUID FK)`, `metadata (JSONB)`, `created_at`.

### Financeiro & Ledger
- `financial_ledger`: `id (UUID PK)`, `reference_id (UUID NULLABLE)`, `reference_type (VARCHAR 50)`, `account_type (ENUM: driver_balance, platform_revenue, passenger_wallet, escrow)`, `account_id (UUID)`, `entry_type (ENUM: credit, debit)`, `amount_cents (BIGINT)`, `balance_after_cents (BIGINT)`, `description (TEXT)`, `created_at`.
- `payments`: `id (UUID PK)`, `ride_id (UUID FK)`, `gateway_transaction_id (VARCHAR 100)`, `amount_cents (INT)`, `gateway_fee_cents (INT)`, `status (ENUM: pending, paid, refunded, disputed)`, `payload_raw (JSONB)`.

### Índices Críticos
- `CREATE INDEX idx_rides_pickup_location ON rides USING GIST (pickup_location);`
- `CREATE INDEX idx_service_areas_polygon ON service_areas USING GIST (polygon);`
- `CREATE INDEX idx_rides_status_passenger ON rides (passenger_id, status);`
- `CREATE INDEX idx_rides_status_driver ON rides (driver_id, status);`
- `CREATE INDEX idx_ledger_account_created ON financial_ledger (account_id, created_at DESC);`
