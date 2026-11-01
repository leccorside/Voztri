# VOZTRI — Plano de Execução e Registro de Etapas (PASSOS.md)

Este documento registra todas as fases do desenvolvimento da plataforma **VOZTRI**, detalhando objetivos, tarefas, dependências, critérios de aceite, testes e status em tempo real.

---

## Índice de Fases

- [Fase 0: Análise Arquitetural e Fundação do Monorepo](#fase-0--análise-arquitetural-e-fundação-do-monorepo) — `CONCLUÍDO`
- [Fase 1: Fundação, Infraestrutura Docker e Autenticação](#fase-1--fundação-infraestrutura-docker-e-autenticação) — `CONCLUÍDO`
- [Fase 2: Sistema de Geolocalização, Mapas Open Source e GPS](#fase-2--sistema-de-geolocalização-mapas-open-source-e-gps) — `CONCLUÍDO`
- [Fase 3: Aplicativo do Motorista (Onboarding, Documentos e Dashboard)](#fase-3--aplicativo-do-motorista-onboarding-documentos-e-dashboard) — `CONCLUÍDO`
- [Fase 4: Aplicativo do Passageiro (Home, Destino, Categorias e Estimativa)](#fase-4--aplicativo-do-passageiro-home-destino-categorias-e-estimativa) — `CONCLUÍDO`
- [Fase 5: Motor de Distribuição de Corridas e Máquina de Estados](#fase-5--motor-de-distribuição-de-corridas-e-máquina-de-estados) — `CONCLUÍDO`
- [Fase 6: Sistema de Pagamentos, Split Pix/Cartão e Ledger Financeiro](#fase-6--sistema-de-pagamentos-split-pixcartão-e-ledger-financeiro) — `CONCLUÍDO`
- [Fase 7: Experiência Completa (Chat WebSockets, SOS 24h, Avaliações e Cupons)](#fase-7--experiência-completa-chat-websockets-sos-24h-avaliações-e-cupons) — `CONCLUÍDO`
- [Fase 8: Painel Administrativo Master Web](#fase-8--painel-administrativo-master-web) — `CONCLUÍDO`
- [Fase 9: Qualidade, Testes de Concorrência, Segurança e Resiliência](#fase-9--qualidade-testes-de-concorrência-segurança-e-resiliência) — `CONCLUÍDO`
- [Fase 10: Compilação Android, Release Builds e Permissões de Fundo](#fase-10--compilação-android-release-builds-e-permissões-de-fundo) — `CONCLUÍDO`
- [Fase 11: Preparação Multiplataforma iOS e Conformidade](#fase-11--preparação-multiplataforma-ios-e-conformidade) — `CONCLUÍDO`

---

### Fase 0 — Análise Arquitetural e Fundação do Monorepo
- **Status**: `CONCLUÍDO`
- **Objetivo**: Estruturar o monorepo com pacotes TypeScript compartilhados, padrões de tipagem, tokens de design baseados na identidade visual e documentações estratégicas.
- **Tarefas**:
  - [x] Criação da estrutura de pastas do monorepo (`apps/`, `backend/`, `packages/`, `infrastructure/`, `docs/`).
  - [x] Elaboração de `CONTEXTO.md`, `DOCUMENTACAO.md` e `PASSOS.md`.
  - [x] Criação de documentos arquiteturais (`docs/arquitetura-modulos.md`, `docs/modelo-banco-dados.md`, `docs/estrategia-mapas.md`, `docs/estrategia-gps.md`, `docs/estrategia-pagamentos.md`, `docs/estrategia-multiplataforma-android-ios.md`, `docs/plano-de-testes.md`).
  - [x] Implementação dos pacotes `@voztri/design-tokens`, `@voztri/shared-types`, `@voztri/validation`, `@voztri/localization`, `@voztri/api-client`.
  - [x] Integração da paleta oficial VOZTRI (`#6A00FF`, `#9B4DFF`, `#0B1026`) e especificações do `DESIGN.md`.
- **Dependências**: Nenhuma.
- **Critérios de Aceite**: Pacotes compilando sem erros de tipos, tokens padronizados e documentação técnica completa.
- **Testes**: Verificação de integridade dos arquivos TypeScript e esquemas Zod.

---

### Fase 1 — Fundação, Infraestrutura Docker e Autenticação
- **Status**: `CONCLUÍDO`
- **Objetivo**: Configurar o ambiente Docker completo (PHP 8.3-FPM, Nginx, PostgreSQL 16 + PostGIS 3.4, Redis 7, Laravel Reverb) e o backend Laravel com arquitetura DDD modular e autenticação via Sanctum para passageiros, motoristas e administradores.
- **Tarefas**:
  - [x] `docker-compose.yml` orquestrando web, app, postgresql+postgis, redis, reverb, queue-worker, minio e mailpit.
  - [x] Dockerfile otimizado para PHP com extensões `pdo_pgsql`, `pcntl`, `redis`, `bcmath`, `gd`, `zip`.
  - [x] Migrations fundamentais: `users`, `user_profiles`, `roles`, `permissions`, `passengers`, `drivers`, `driver_vehicles`, `cities`, `audit_logs`.
  - [x] Domain Models e Enums: `UserRole`, `DriverStatus`, `VehicleCategoryEnum`.
  - [x] Controladores de autenticação: login por telefone/OTP, validação de tokens Sanctum, perfil do usuário.
- **Dependências**: Fase 0.
- **Critérios de Aceite**: Containers Docker sobem com `docker compose up -d`, migrations executadas com sucesso, endpoints `/api/v1/auth/login`, `/api/v1/auth/verify-otp`, `/api/v1/auth/me` funcionais com respostas JSON padronizadas.
- **Testes**: Testes de rotas de autenticação e validação de token Sanctum.

---

### Fase 2 — Sistema de Geolocalização, Mapas Open Source e GPS
- **Status**: `CONCLUÍDO`
- **Objetivo**: Implementar a infraestrutura de mapas 100% livre de cobranças proprietárias com MapLibre, PostGIS para consultas espaciais, provedor de rotas OSRM, geocodificação Photon/Nominatim e WebSocket de GPS em tempo real.
- **Tarefas**:
  - [x] Serviço de cálculo de rota viária e distância/tempo real via OSRM (`OsrmRoutingService`).
  - [x] Serviço de geocodificação reversa e busca de endereços (`PhotonGeocodingService`).
  - [x] Atualização de posição GPS do motorista armazenada no Redis (`GEOADD`) e persistida no PostGIS (`ST_SetSRID(ST_MakePoint(...), 4326)`).
  - [x] Transmissão WebSocket em tempo real via canais privados Laravel Reverb (`driver.location.{driverId}`, `city.drivers.{cityId}`).
  - [x] Implementação de Geofencing e verificação de áreas de atendimento da cidade.
- **Dependências**: Fase 1.
- **Critérios de Aceite**: Busca por motoristas próximos em raio de 2km/5km/8km retornando dados geográficos corretos; cálculo de trajeto com polyline decodificável.
- **Testes**: Teste unitário de cálculo OSRM e consulta geoespacial PostGIS.

---

### Fase 3 — Aplicativo do Motorista (Onboarding, Documentos e Dashboard)
- **Status**: `CONCLUÍDO`
- **Objetivo**: Desenvolver o fluxo operacional do motorista baseado nos protótipos da pasta `identidade/prototipos/` (`voztri_motorista_dashboard_operacional`, `voztri_motorista_cadastro_do_ve_culo`, `voztri_motorista_envio_de_documentos`, etc.).
- **Tarefas**:
  - [x] Telas de login celular e verificação OTP (`voztri_motorista_entrar_com_celular`, `voztri_motorista_verifica_o_de_c_digo_otp`).
  - [x] Cadastro de veículo e envio de CNH/CRLV (`voztri_motorista_cadastro_do_ve_culo`, `voztri_motorista_envio_de_documentos`).
  - [x] Tela de status de aprovação documental e ativação de conta.
  - [x] Dashboard operacional com toggle Online/Offline, ganhos do dia, mapa de demanda e métricas de desempenho.
  - [x] Serviço nativo simulado/modular de transmissão de GPS em background no app React Native.
- **Dependências**: Fase 2.
- **Critérios de Aceite**: Motorista altera status para ONLINE, sua coordenada é transmitida ao backend e exibida no radar de busca.
- **Testes**: Testes de validação de documentos, transição de disponibilidade e schemas Zod.

---

### Fase 4 — Aplicativo do Passageiro (Home, Destino, Categorias e Estimativa)
- **Status**: `CONCLUÍDO`
- **Objetivo**: Implementar o aplicativo móvel do passageiro com base nos protótipos de `identidade/prototipos/` (`voztri_in_cio_mapa`, `voztri_categorias_rota`, `voztri_confirma_o_de_solicita_o`, etc.).
- **Tarefas**:
  - [x] Tela inicial com mapa interativo MapLibre, busca de destino rápida e marcador de localização cinético VOZTRI.
  - [x] Bottom sheet de seleção de categorias: Econômico (VozTri Pop), Conforto (VozTri Black), Mulher (VozTri Mulher) e Moto (VozTri Moto).
  - [x] Exibição de rota traçada com Polyline, distância em km, tempo estimado e valor da tarifa.
  - [x] Seleção da forma de pagamento (Pix, Cartão de Crédito, Saldo em Carteira ou Dinheiro).
  - [x] Tela de radar/busca de motoristas em tempo real (`voztri_radar_busca_de_motoristas`).
- **Dependências**: Fase 2.
- **Critérios de Aceite**: Passageiro digita destino, visualiza rota no mapa, seleciona categoria com preço calculado pelo backend e aciona solicitação de corrida.
- **Testes**: Validação de requisição de corrida e cálculo de estimativa.

---

### Fase 5 — Motor de Distribuição de Corridas e Máquina de Estados
- **Status**: `CONCLUÍDO`
- **Objetivo**: Implementar o núcleo do sistema: despacho concorrente de corridas com proteção contra dupla atribuição, locks pessimistas e máquina de estados rigorosa.
- **Tarefas**:
  - [x] Máquina de estados: `REQUESTED`, `SEARCHING`, `OFFERED`, `ACCEPTED`, `DRIVER_EN_ROUTE`, `DRIVER_ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_DRIVER_AVAILABLE`.
  - [x] Algoritmo de despacho inteligente: busca concêntrica (2km, 5km, 8km, 12km) considerando ETA real, avaliação do motorista e categoria do veículo.
  - [x] Oferta com timeout (15 a 20 segundos) e repasse para próximo motorista caso rejeitada ou expirada.
  - [x] Atomicidade e lock distribuído no Redis para garantir que apenas um motorista aceite a corrida.
  - [x] Código de embarque PIN de 4 dígitos validado no início da viagem (`voztri_motorista_embarque_valida_o_pin`).
- **Dependências**: Fase 3, Fase 4.
- **Critérios de Aceite**: Simulação de múltiplos motoristas simultâneos assegurando que apenas um consiga o aceite com sucesso; transição de estados refletida via WebSocket para ambos os apps.
- **Testes**: Testes de concorrência com cenários de aceite duplo simultâneo.

---

### Fase 6 — Sistema de Pagamentos, Split Pix/Cartão e Ledger Financeiro
- **Status**: `CONCLUÍDO`
- **Objetivo**: Camada de pagamentos desacoplada com suporte a Pix imediato (QR Code / Copia e Cola), Cartão de Crédito e Dinheiro, integrando Ledger de partidas dobradas e controle de repasse.
- **Tarefas**:
  - [x] Interface `PaymentGatewayInterface` e implementação sandbox/provedor Asaas/MercadoPago.
  - [x] Cálculo tarifário imutável com precisão decimal (`valor_base + (km * taxa_km) + (minutos * taxa_min) + adicional_dinamico`).
  - [x] Geração e confirmação de Pix via Webhooks idempotentes.
  - [x] Ledger financeiro imutável: saldo motorista, comissão plataforma (ex: 15%), retenções e saques.
  - [x] Telas de carteira do passageiro e extrato de repasses Pix do motorista (`voztri_carteira_pagamentos`, `voztri_motorista_extrato_repasse_pix`).
- **Dependências**: Fase 5.
- **Critérios de Aceite**: Cobrança processada pelo backend, ledger gravando débito e crédito balanceados, extrato atualizado em tempo real.
- **Testes**: Testes unitários do Ledger financeiro e webhook de pagamento com token de segurança.

---

### Fase 7 — Experiência Completa (Chat WebSockets, SOS 24h, Avaliações e Cupons)
- **Status**: `CONCLUÍDO`
- **Objetivo**: Integrar os recursos avançados de segurança e usabilidade baseados nos protótipos visuais (`voztri_chat_com_motorista`, `voztri_central_de_emerg_ncia_sos_24h`, `voztri_avalia_o_gorjeta`).
- **Tarefas**:
  - [x] Chat em tempo real motorista-passageiro com WebSockets e mensagens pré-definidas ("Estou chegando", "Estou no portão").
  - [x] Central de emergência SOS 24h com acionamento silencioso, gravação de ocorrência, compartilhamento de rota e PIN de desativação (`voztri_desativa_o_de_sos_com_autentica_o_de_seguran_a`).
  - [x] Sistema de avaliação (1 a 5 estrelas) com cálculo de gorjeta e tags de feedback.
  - [x] Gestão e validação de cupons de desconto (`DISCOUNT_FIXED`, `DISCOUNT_PERCENT`).
- **Dependências**: Fase 6.
- **Critérios de Aceite**: Mensagens trafegando instantaneamente entre apps durante a corrida; botão SOS disparando alerta operacional no backend.
- **Testes**: Testes de envio de mensagens no chat e fluxo de ativação/cancelamento do SOS.

---

### Fase 8 — Painel Administrativo Master Web
- **Status**: `CONCLUÍDO`
- **Objetivo**: Construir o painel web responsivo para gestão operacional, frotas, compliance e monitoramento ao vivo em React + TypeScript + Vite + Tailwind CSS.
- **Tarefas**:
  - [x] Dashboard operacional com métricas em tempo real: receita bruta, comissão da plataforma, motoristas online, corridas ativas e cancelamentos.
  - [x] Mapa de operações ao vivo com posicionamento geográfico de todos os motoristas e corridas em andamento.
  - [x] Módulo de gestão e auditoria de motoristas: aprovação de CNH/veículo, histórico e bloqueios.
  - [x] Configuração dinâmica de tarifas e polígonos de atendimento por cidade.
  - [x] Visualizador de trilha de auditoria (`audit_logs`) com detalhes de todas as alterações críticas.
- **Dependências**: Fase 7.
- **Critérios de Aceite**: Administrador acessa `/admin`, visualiza indicadores, filtra motoristas e aprova documentação pendente.
- **Testes**: Testes de autenticação de administrador e endpoints de gestão.

---

### Fase 9 — Qualidade, Testes de Concorrência, Segurança e Resiliência
- **Status**: `CONCLUÍDO`
- **Objetivo**: Validação extensiva de segurança, conformidade LGPD, antifraude, testes de carga e testes automatizados de ponta a ponta.
- **Tarefas**:
  - [x] Testes de concorrência com dois motoristas tentando aceitar a mesma corrida simultaneamente.
  - [x] Validação de idempotência em endpoints de pagamento e webhooks.
  - [x] Sanitização contra SQL Injection, rate limiting configurado e verificação de integridade de dados.
  - [x] Verificações antifraude: detecção de spoofing GPS, viagens anormais e conluio.
  - [x] Script de teste de estresse / carga com k6 simulando 100 requisições simultâneas de corrida.
- **Dependências**: Fase 8.
- **Critérios de Aceite**: 100% dos testes de concorrência e idempotência passando sem falhas de integridade ou duplicidade.
- **Testes**: Suíte completa de testes automatizados executada.

---

### Fase 10 — Compilação Android, Release Builds e Permissões de Fundo
- **Status**: `CONCLUÍDO`
- **Objetivo**: Preparação dos aplicativos Android para geração de APK de teste e AAB para Google Play Store, com todas as permissões nativas configuradas.
- **Tarefas**:
  - [x] Configuração do `android/app/build.gradle` com chaves de release, ProGuard e otimização Hermes.
  - [x] `AndroidManifest.xml` com permissões rigorosas: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`, `WAKE_LOCK`.
  - [x] Script automatizado de compilação de APK e AAB (`infrastructure/scripts/build-android.sh` / `.bat`).
  - [x] Checklist de publicação na Google Play Store e política de privacidade conforme LGPD.
- **Dependências**: Fase 9.
- **Critérios de Aceite**: Configurações de build Android prontas e validadas sintaticamente.
- **Testes**: Validação do manifesto e scripts de build.

---

### Fase 11 — Preparação Multiplataforma iOS e Conformidade
- **Status**: `CONCLUÍDO`
- **Objetivo**: Garantir que toda a base de código React Native esteja 100% pronta para compilação futura em iOS sem nenhuma lógica acoplada exclusivamente a Android.
- **Tarefas**:
  - [x] Auditoria de dependências garantindo que nenhuma biblioteca seja Android-only sem fallback.
  - [x] Configuração de permissões no `Info.plist` (`NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`).
  - [x] Camada abstrata para notificações push preparando suporte a Apple Push Notification service (APNs).
  - [x] Guia completo de build iOS no Xcode e checklist Apple Developer Program (`docs/guia-build-ios.md`).
- **Dependências**: Fase 10.
- **Critérios de Aceite**: Arquitetura modular de plataforma implementada e documentada para submissão futura na Apple App Store.
- **Testes**: Validação estática de compatibilidade multiplataforma.
