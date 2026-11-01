# Arquitetura dos Módulos do Sistema VOZTRI

## 1. Organização Domain-Driven Design (DDD) Modular

O backend VOZTRI é estruturado como um monolito modular baseado em DDD para manter alto desacoplamento, facilidade de manutenção e consistência transacional:

```text
backend/app/
├── Domain/
│   ├── Auth/
│   │   ├── Entities/ (User, Role, Permission)
│   │   ├── Enums/ (UserRole, AuthProvider)
│   │   └── Repositories/ (UserRepositoryInterface)
│   ├── Driver/
│   │   ├── Entities/ (Driver, Vehicle, DriverDocument, DriverLocation)
│   │   ├── Enums/ (DriverStatus, DocumentType, VehicleCategory)
│   │   └── Repositories/ (DriverRepositoryInterface)
│   ├── Passenger/
│   │   ├── Entities/ (Passenger, TrustedContact)
│   │   └── Repositories/ (PassengerRepositoryInterface)
│   ├── Ride/
│   │   ├── Entities/ (Ride, RideOffer, RideStop, RideCancellation)
│   │   ├── Enums/ (RideStatus, CancellationReason)
│   │   ├── Services/ (RideStateMachine, DispatchEngine, FareCalculator)
│   │   └── Repositories/ (RideRepositoryInterface)
│   ├── Billing/
│   │   ├── Entities/ (Payment, PaymentMethod, LedgerEntry, Payout)
│   │   ├── Enums/ (PaymentStatus, PaymentType, LedgerType)
│   │   └── Repositories/ (LedgerRepositoryInterface)
│   └── Geo/
│   │   ├── Entities/ (City, ServiceArea, Geofence)
│   │   └── Services/ (RoutingServiceInterface, GeocodingServiceInterface)
├── Application/
│   ├── UseCases/
│   │   ├── Auth/ (AuthenticateWithOtpUseCase, RefreshTokenUseCase)
│   │   ├── Ride/ (RequestRideUseCase, AcceptRideUseCase, StartRideUseCase, CompleteRideUseCase)
│   │   ├── Driver/ (UpdateDriverLocationUseCase, ToggleDriverAvailabilityUseCase)
│   │   └── Billing/ (ProcessRidePaymentUseCase, GeneratePixChargeUseCase)
│   └── DTOs/
├── Infrastructure/
│   ├── Persistence/ (Eloquent models e Repositórios concretos)
│   ├── Geo/ (OsrmClient, PhotonClient, PostgisDistanceCalculator)
│   ├── Payments/ (AsaasGatewayAdapter, MercadoPagoGatewayAdapter, MockGateway)
│   ├── Realtime/ (ReverbBroadcaster, RedisGeoTracker)
│   └── Push/ (FirebaseCloudMessagingService, ApnsService)
└── Http/
    ├── Controllers/ (Api/v1/...)
    ├── Requests/ (FormRequests com validação estrita)
    └── Resources/ (JsonResources padronizados)
```

## 2. Comunicação entre Módulos
- Módulos se comunicam via interfaces de domínio e Domain Events (`RideRequestedEvent`, `RideAcceptedEvent`, `RideCompletedEvent`).
- Eventos de domínio são disparados no barramento de eventos do Laravel e processados de forma assíncrona quando não bloqueantes (ex: envio de push notifications, registro em ledger, envio de recibo).
- Operações de concorrência crítica (despacho e aceite) ocorrem em transação de banco com locks pessimistas (`SELECT ... FOR UPDATE`) e lock distribuído em Redis.

