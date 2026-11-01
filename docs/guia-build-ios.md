# Guia de Preparação e Build para iOS — VOZTRI

Este documento descreve como compilar e publicar os aplicativos VOZTRI (Passageiro e Motorista) no ecossistema Apple iOS através do Xcode e CocoaPods.

## 1. Arquitetura Multiplataforma
O projeto foi estruturado sem dependências exclusivas de Android. Toda a lógica de estado (Zustand), cliente HTTP (Axios), validações (Zod), internacionalização e tokens de design é 100% compartilhada entre as plataformas.

## 2. Requisitos de Ambiente macOS
- macOS Sonoma ou superior
- Xcode 15+ com Command Line Tools instaladas
- CocoaPods 1.14+ (`gem install cocoapods`)
- Node.js 20 LTS

## 3. Passos para Compilação no macOS
```bash
# 1. Navegue até a pasta do aplicativo desejado
cd apps/passenger-mobile/ios  # ou apps/driver-mobile/ios

# 2. Instale as dependências nativas CocoaPods
pod install

# 3. Abra o projeto no Xcode
open VOZTRI.xcworkspace
```

## 4. Assinatura e Apple Developer Program
- No Xcode, acesse a aba **Signing & Capabilities**.
- Selecione sua Team Apple Developer ativa.
- Certifique-se de que os Capabilities `Background Modes (Location updates, Remote notifications)` e `Push Notifications` estão habilitados.
- Gere o archive para TestFlight com `Product -> Archive`.
