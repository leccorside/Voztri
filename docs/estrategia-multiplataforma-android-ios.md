# Estratégia Multiplataforma (Android Priority & iOS Readiness)

## 1. Diretriz Multiplataforma
O aplicativo utiliza React Native com TypeScript puro, estruturado de modo a compartilhar 100% da lógica de negócio, stores Zustand, cliente de API, modelos de dados e tokens visuais.

```text
apps/passenger-mobile/
apps/driver-mobile/
├── src/
│   ├── components/      # Componentes UI reutilizáveis (botões, cards, bottom sheets)
│   ├── screens/         # Telas mapeadas dos protótipos
│   ├── store/           # Zustand stores (authStore, rideStore, locationStore)
│   ├── services/        # Platform abstraction providers
│   │   ├── LocationService.ts     (Android: FusedLocation / iOS: CoreLocation)
│   │   ├── StorageService.ts      (Android: EncryptedSharedPreferences / iOS: Keychain)
│   │   ├── NotificationService.ts (Android: FCM / iOS: APNs)
│   │   └── HapticService.ts       (Feedback tátil multiplataforma)
│   └── routes/          # React Navigation (Native Stack)
```

## 2. Preparação iOS
- **Info.plist**: Contém todas as descrições de permissões exigidas pela Apple App Store (`NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`).
- **Nenhuma dependência proprietária Android sem abstração**: Chamadas nativas utilizam adaptadores com fallback para que a compilação no Xcode futuramente ocorra de forma imediata e sem atrito.
