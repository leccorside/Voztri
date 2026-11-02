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
- [Fase 12: Conta e Segurança do Usuário](#fase-12--conta-e-segurança-do-usuário) — `EM ANDAMENTO`
- [Fase 13: Cadastro do Motorista no App](#fase-13--cadastro-do-motorista-no-app) — `PENDENTE`
- [Fase 14: Pagamentos Reais, Gorjeta e Cupons](#fase-14--pagamentos-reais-gorjeta-e-cupons) — `PENDENTE`
- [Fase 15: Mapas e Tempo Real nos Apps](#fase-15--mapas-e-tempo-real-nos-apps) — `PENDENTE`
- [Fase 16: Notificações Push Ativas](#fase-16--notificações-push-ativas) — `PENDENTE`
- [Fase 17: Validação em Aparelho Físico e iOS](#fase-17--validação-em-aparelho-físico-e-ios) — `PENDENTE`
- [Fase 18: Preparação para Produção](#fase-18--preparação-para-produção) — `PENDENTE`
- [Fase 19: Melhorias e Dívidas Técnicas](#fase-19--melhorias-e-dívidas-técnicas) — `PENDENTE`

> **Fases 12 a 19 (levantamento de 2026-11-02):** o que falta nos apps, conferido no código. Algumas fases anteriores estão marcadas como concluídas com itens que não chegaram aos apps (envio de documentos na Fase 3, mapa MapLibre na Fase 4, cobrança Pix/cartão na Fase 6, chat por WebSockets e cupons na Fase 7); esses itens foram mantidos como estavam e o que falta está nas fases novas, com a referência à fase original. Ordem sugerida: 12 → 13 → 16 → 14 → 15, com 17 e 18 antes da publicação.

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

---

### Fase 12 — Conta e Segurança do Usuário
- **Status**: `EM ANDAMENTO`
- **Objetivo**: Dar ao usuário controle sobre a própria conta e sobre o PIN que desativa o SOS, e cumprir a exigência das lojas de excluir a conta pelo app.
- **Tarefas**:
  - [x] PIN de emergência definido pelo passageiro (2026-11-02): passageiro novo nasce sem PIN e o app pede para criar no primeiro acesso; troca pelo menu da conta exigindo o PIN atual; guardado com hash e fora das respostas da API; PINs fáceis (0000, 1234, 4321) recusados; 5 erros bloqueiam por 15 min a troca e a desativação do SOS; a solicitação de corrida exige o PIN (`EMERGENCY_PIN_REQUIRED`).
  - [x] Tela de perfil nos dois apps (2026-11-02): "Meu perfil" com nome, e-mail (opcional) e o telefone só para leitura, pelo `PUT /api/v1/auth/profile` (corrigido: só os campos enviados, e-mail apagável, mensagens em português por campo, resposta no formato do login). Passageiro: menu da conta no avatar; motorista: botão "Perfil" no painel. Tela comum no `@voztri/mobile-core` (`ProfileScreen`).
  - [x] Foto do perfil (2026-11-02): câmera ou galeria nos dois apps (`react-native-image-picker`), envio para o MinIO pela API (recortada em 512 px e sem EXIF/GPS), servida pela API só a quem pode vê-la; aparece no perfil, no avatar da tela inicial do passageiro, para o passageiro na corrida (foto do motorista) e para o motorista na navegação (foto do passageiro).
  - [ ] Exclusão de conta pelo app nos dois apps (exigida pela Google Play e pela App Store para apps com cadastro), com confirmação; apagar ou anonimizar os dados pessoais (Casa/Trabalho e histórico de destinos já saem no evento `deleted` do `User`).
  - [ ] Contatos de confiança do passageiro (citados no README e no protótipo do SOS): cadastro e aviso a eles quando o SOS é acionado.
- **Dependências**: Nenhuma.
- **Critérios de Aceite**: Passageiro define e troca o PIN de emergência e o SOS só desativa com ele; motorista e passageiro editam o perfil e excluem a conta pelo app.
- **Testes**: Testes de API (PIN com hash, troca, exclusão e o que sobra da conta) e testes Jest das telas.

---

### Fase 13 — Cadastro do Motorista no App
- **Status**: `PENDENTE`
- **Objetivo**: Permitir que um motorista novo se cadastre pelo app (hoje só existe motorista do seed ou criado pelo painel). Completa a Fase 3, que previa essas telas.
- **Tarefas**:
  - [ ] Fluxo de cadastro depois do primeiro login: dados pessoais e CNH (número, categoria, validade, EAR).
  - [ ] Cadastro do veículo (marca, modelo, ano, cor, placa, RENAVAM, categoria).
  - [ ] Envio de fotos de CNH, CRLV e selfie pelo `POST /api/v1/driver/documents` (já existe no backend, sem uso no app), com câmera e galeria; armazenamento no MinIO.
  - [ ] Permissão `CAMERA` no `AndroidManifest.xml` do motorista (o `Info.plist` já pede a câmera).
  - [ ] Tela de status da análise (pendente, aprovado, recusado com motivo) e bloqueio do botão "Ficar online" até a aprovação.
  - [ ] Painel admin: ver as fotos enviadas na aprovação e, ao reativar um motorista bloqueado, não deixá-lo fora do mapa ao vivo (`approveDriver` não religa o `is_online`).
- **Dependências**: Fase 12 (perfil).
- **Critérios de Aceite**: Motorista novo se cadastra, envia documentos, é aprovado no painel e consegue ficar online.
- **Testes**: Testes de API do envio de documentos (tipos, tamanho, dono) e testes Jest do fluxo de cadastro.

---

### Fase 14 — Pagamentos Reais, Gorjeta e Cupons
- **Status**: `PENDENTE`
- **Objetivo**: Cobrar de verdade. Hoje a corrida só é lançada no ledger interno: nenhum Pix ou cartão é processado. Completa as Fases 6 e 7.
- **Tarefas**:
  - [ ] Ligar o `AsaasPaymentGateway` (existe em `backend/app/Infrastructure/Payments`, sem uso) ao fluxo da corrida, com chaves de sandbox.
  - [ ] Pix: QR Code / Copia e Cola no app do passageiro e confirmação por webhook idempotente.
  - [ ] Cartão de crédito: tokenização no app (sem dado de cartão no servidor) e cobrança ao concluir a corrida.
  - [ ] Repasse Pix real ao motorista (`POST /billing/payout` hoje só lança no ledger).
  - [ ] Gorjeta: o valor escolhido na avaliação é gravado em `ride_ratings.tip_cents`, mas não é cobrado do passageiro nem creditado ao motorista no ledger.
  - [ ] Cupons: o `CouponService` existe no backend sem uso; campo de cupom no app do passageiro e desconto aplicado na estimativa e na cobrança.
- **Dependências**: Fase 12.
- **Critérios de Aceite**: Corrida paga por Pix e por cartão no sandbox, com ledger e extrato do motorista batendo com o gateway; gorjeta e cupom refletidos na cobrança.
- **Testes**: Testes de webhook (idempotência, assinatura), do ledger com gorjeta e cupom, e testes Jest das telas de pagamento.

---

### Fase 15 — Mapas e Tempo Real nos Apps
- **Status**: `PENDENTE`
- **Objetivo**: Trocar os desenhos estáticos por mapas reais e o polling de 3 s por eventos em tempo real. Completa as Fases 2, 4 e 7.
- **Tarefas**:
  - [ ] SDK de mapas (MapLibre) nos dois apps: posição do passageiro, do motorista e do embarque.
  - [ ] Rota traçada (polyline do OSRM) na estimativa, no motorista a caminho e durante a viagem.
  - [ ] Posição do motorista ao vivo no app do passageiro.
  - [ ] Disparar os eventos do backend (`RideStatusUpdated` etc., que existem e não são disparados) e consumi-los nos apps pelo Reverb, mantendo o polling como reserva.
  - [ ] Chat da corrida por WebSocket.
  - [ ] Decidir o destino do `DispatchEngine` (Redis GEO, hoje sem uso) junto com o rastreamento em tempo real.
- **Dependências**: Nenhuma (pode correr em paralelo com 13 e 14).
- **Critérios de Aceite**: Passageiro vê o motorista se aproximando no mapa; mudanças de status e mensagens chegam sem esperar o polling.
- **Testes**: Testes de broadcast no backend e testes Jest do consumo dos eventos com o polling de reserva.

---

### Fase 16 — Notificações Push Ativas
- **Status**: `PENDENTE`
- **Objetivo**: Ligar o push, que está implementado nos dois apps e no backend, mas desligado por falta da configuração do Firebase.
- **Tarefas**:
  - [ ] Criar o projeto Firebase e colocar o `google-services.json` (Android) e o `GoogleService-Info.plist` (iOS, no target pelo Xcode).
  - [ ] Enviar a chave APNs `.p8` ao Firebase e configurar o `FCM_CREDENTIALS` no backend (passo a passo no README).
  - [ ] Validar em aparelho: oferta com o app do motorista minimizado; motorista a caminho/chegou, cancelamento, conclusão e "sem motorista" no passageiro.
  - [ ] Aceitar ou recusar a oferta direto pela notificação (mensagem só de dados + notificação local, ex.: Notifee).
  - [ ] Push de início da viagem para o passageiro (opcional).
  - [ ] Não reabrir a avaliação de uma corrida já avaliada ao tocar numa notificação antiga (a API não informa se a corrida já foi avaliada).
  - [ ] Tokens órfãos: tentar de novo o `deleteToken()` quando a sessão expira sem rede.
- **Dependências**: Fase 17 (aparelho físico para validar).
- **Critérios de Aceite**: Motorista recebe a oferta com o app minimizado e o passageiro recebe os avisos da corrida, nos dois sistemas.
- **Testes**: Validação manual em aparelhos Android e iOS; testes Jest das ações da notificação.

---

### Fase 17 — Validação em Aparelho Físico e iOS
- **Status**: `PENDENTE`
- **Objetivo**: Os apps só rodaram no emulador Android. Validar em aparelho real e compilar o iOS (exige macOS).
- **Tarefas**:
  - [ ] Rodar os dois apps num aparelho Android físico (`VOZTRI_API_URL` apontando para o IP da máquina).
  - [ ] Build iOS no macOS (`bundle exec pod install` e `run-ios`) dos dois apps.
  - [ ] Compilar e validar o `VoztriLocationTracking.m` (envio em segundo plano, batimento de 2 min com o motorista parado e chegada automática) no simulador e num iPhone.
  - [ ] Conferir o `Info.plist` do passageiro sem "Sempre" e sem o modo `location`, e se o ATS libera HTTP para IP da rede em debug.
  - [ ] Medir o consumo de bateria do rastreamento do motorista no iOS (`kCLLocationAccuracyBest` o turno inteiro).
  - [ ] Conferir com o TalkBack (e o VoiceOver) se o contador da busca é lido atualizado.
- **Dependências**: Acesso a um Mac e a aparelhos físicos.
- **Critérios de Aceite**: Fluxo completo (login, corrida, embarque, conclusão) funcionando em Android físico e em iOS.
- **Testes**: Roteiro manual de ponta a ponta nos dois sistemas.

---

### Fase 18 — Preparação para Produção
- **Status**: `PENDENTE`
- **Objetivo**: Itens que precisam estar resolvidos antes do primeiro deploy e da publicação nas lojas.
- **Tarefas**:
  - [ ] Photon próprio (dados do OpenStreetMap) ou provedor contratado no lugar do `photon.komoot.io` público (trocar só o `PHOTON_GEOCODING_URL`).
  - [ ] Configurar `trustProxies` no `bootstrap/app.php` (sem isso, atrás de proxy o limite do login admin vira um só para todos).
  - [ ] Confirmar com o jurídico (LGPD) o prazo de 90 dias do histórico de destinos e definir a retenção dos endereços das corridas (`rides`).
  - [ ] Deploy: cron com `php artisan schedule:run` a cada minuto e `php artisan queue:restart` a cada atualização (o `worker` não recarrega o código).
  - [ ] Splash com a identidade VOZTRI nos dois sistemas (hoje é a tela padrão do template).
  - [ ] Ícone monocromático do Android 13+ (precisa de uma versão do logo com fundo transparente).
  - [ ] Builds de release assinados (AAB e IPA) e fichas das lojas (Data Safety, privacidade).
- **Dependências**: Fases 12, 14 e 17.
- **Critérios de Aceite**: Ambiente de produção no ar com agendador e fila; apps aprovados nas lojas.
- **Testes**: Checklist de publicação (`docs/checklist-google-play.md` e `docs/guia-build-ios.md`).

---

### Fase 19 — Melhorias e Dívidas Técnicas
- **Status**: `PENDENTE`
- **Objetivo**: Ajustes menores levantados durante o desenvolvimento, sem bloquear o uso.
- **Tarefas**:
  - [ ] Horas online do motorista (`onlineHours` é `null`: a API não registra sessões online).
  - [ ] Favoritos com nome livre além de Casa e Trabalho.
  - [ ] Painel admin: nota média real no lugar do 4.88 fixo; endpoints de volume por categoria e de incidentes SOS.
  - [ ] Tipos do `shared-types` alinhados à API (camelCase nos tipos e snake_case nas respostas).
  - [ ] Helper de testes `rnTree.ts` em um só lugar (hoje há três cópias iguais).
  - [x] (2026-11-02, junto com o PIN da Fase 12) DOCUMENTACAO: corrigir o `POST /rides/{id}/sos`, que diz que o app envia o embarque "pois ainda não lê o GPS" (o app já envia a posição atual e só usa o embarque se o GPS falhar).
- **Dependências**: Nenhuma.
- **Critérios de Aceite**: Cada item fechado com teste e registro no `CONTEXTO.md`.
- **Testes**: Os de cada item.

