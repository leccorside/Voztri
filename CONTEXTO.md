# VOZTRI — Contexto do Projeto e Arquitetura Viva

## 1. Visão Geral e Missão
O **VOZTRI** é uma plataforma completa e real de mobilidade urbana com funcionalidades equivalentes às principais soluções do mercado brasileiro (Uber e 99). O sistema permite que passageiros solicitem corridas e motoristas aceitem solicitações, com rastreamento GPS em tempo real, cálculo dinâmico de tarifas, split/repasses de pagamentos (Pix, Cartão, Dinheiro), avaliações, chat com WebSockets, central de emergência SOS 24h e painel administrativo master para gestão operacional e financeira.

## 2. Princípios Arquiteturais e Diretrizes
1. **Tecnologias Open Source e Gratuitas**: Foco em custo zero de licenciamento base, utilizando OpenStreetMap, MapLibre, OSRM/Valhalla, Photon, PostgreSQL + PostGIS, Redis e Docker.
2. **Independência de Provedores**: Abstração completa de serviços de mapas, pagamentos, SMS/OTP e push notifications através de interfaces e adapters desacoplados.
3. **Monolito Modular no Backend**: Arquitetura Domain-Driven Design (DDD) modular em Laravel 12/PHP 8.3, separando Domínio, Aplicação, Infraestrutura e HTTP, viabilizando escalabilidade sem a complexidade prematura de microsserviços.
4. **Multiplataforma Pronta**: React Native com TypeScript compartilhando 100% das regras de negócio, validações Zod, design tokens, internacionalização e tipagens com o painel web administrativo (Vite + React) e permitindo compilação futura para iOS sem reescrita de regras.
5. **Rigor Financeiro e de Concorrência**: Lógica com precisão decimal arbitrária (`bcmath`/inteiros em centavos), Ledger financeiro imutável de partidas dobradas e locks pessimistas/idempotência no despacho de corridas.

## 3. Identidade Visual e Experiência do Usuário (Design System)
- **Cores Principais**:
  - Principal (Roxo Marca): `#6A00FF`
  - Primária Escura: `#4F00C3`
  - Roxo Claro: `#9B4DFF`
  - Lavanda / Destaque: `#C9B2FF`
  - Superfície Escura / Noite: `#0B1026`
  - Superfície Clara: `#F4F6FA` / `#FBF8FF`
  - Texto Primário: `#151A31` / `#FFFFFF`
  - Sucesso: `#00C853` / Alerta: `#FFAB00` / Perigo: `#BA1A1A`
- **Tipografia**: Montserrat (800, 700, 600, 500, 400).
- **Ícone e Logo**: Logomarca oficial VOZTRI com o "V" estilizado integrando gradiente roxo e marcador cinético de geolocalização.

## 4. Estrutura do Monorepo
```text
voztri/
├── apps/
│   ├── passenger-mobile/       # App Passageiro (React Native + MapLibre + Zustand)
│   ├── driver-mobile/          # App Motorista (React Native + Background GPS + HUD de Rota)
│   └── admin-web/              # Painel Administrativo Master (React + Vite + Tailwind + Recharts)
├── backend/
│   ├── app/
│   │   ├── Domain/             # Entidades, Enums, Regras de Negócio e Repositórios
│   │   ├── Application/        # UseCases, DTOs, Serviços de Aplicação
│   │   ├── Infrastructure/     # PostGIS, Redis, Adapters (OSRM, Asaas, FCM, WebSockets)
│   │   ├── Http/               # Controllers REST v1, Middlewares, Requests
│   │   └── Providers/          # Service Providers do Laravel
│   ├── database/               # Migrations PostGIS, Factories, Seeds
│   ├── routes/                 # api.php (v1), channels.php (Reverb WebSockets)
│   └── tests/                  # Testes Unitários, de Integração e Concorrência
├── packages/
│   ├── design-tokens/          # Tokens de cores, espaçamentos, tipografia Montserrat e temas
│   ├── shared-types/           # DTOs e Interfaces TypeScript compartilhadas
│   ├── api-client/             # Cliente HTTP Axios resiliente com interceptors e autenticação
│   ├── validation/             # Esquemas de validação Zod para todas as entidades
│   └── localization/           # i18n (pt-BR, en-US, es-ES)
├── infrastructure/
│   ├── docker/                 # Dockerfiles para PHP-FPM, Nginx, Reverb, Worker
│   ├── nginx/                  # Configuração de proxy reverso e SSL
│   ├── maps/                   # Configuração e tiles OSRM / OpenStreetMap local
│   ├── monitoring/             # Prometheus, Grafana, Loki
│   └── scripts/                # Scripts de setup, migração, seed e build
├── docs/                       # Documentações técnicas e estratégicas
├── docker-compose.yml          # Orquestração completa dos serviços
├── .env.example                # Variáveis de ambiente
├── CONTEXTO.md                 # Visão geral e estado vivo do projeto
├── DOCUMENTACAO.md             # Guia de implantação, rotas e operações
└── PASSOS.md                   # Registro de fases, critérios de aceite e status
```

## 5. Estado Atual do Projeto
- **Fase Atual**: Fase 0 / Fase 1 — Fundação do Monorepo e Arquitetura Concluída.
- **Backend**: Estrutura Laravel 12 com Domain Driven Design, Dockerfile, Nginx, PostgreSQL + PostGIS, Redis, Horizon, Reverb WebSockets.
- **Packages**: `design-tokens`, `shared-types`, `validation`, `localization`, `api-client` criados com tipagens e esquemas completos.
- **Apps**: Estruturados com suporte a TypeScript, React Navigation, Zustand e MapLibre.
- **Documentação**: Especificações de Arquitetura, Banco de Dados, Mapas, GPS, Pagamentos, Multiplataforma e Testes geradas.

### Portas locais (host → contêiner)

| Serviço | Host | Interna |
| --- | --- | --- |
| Nginx (API) | 8080 | 80 |
| Reverb | 8081 | 8081 |
| PostgreSQL | 5434 (`FORWARD_DB_PORT`) | 5432 |
| Redis | 6380 (`FORWARD_REDIS_PORT`) | 6379 |
| MinIO API / Console | 9010 / 9011 (`FORWARD_MINIO_PORT` / `FORWARD_MINIO_CONSOLE_PORT`) | 9000 / 9001 |
| Mailpit SMTP / UI | 1026 / 8026 (`FORWARD_MAIL_PORT` / `FORWARD_MAILPIT_UI_PORT`) | 1025 / 8025 |

## 6. Erros e Correções Conhecidas

- **2026-11-01 — `docker compose up` falhava com `Bind for 0.0.0.0:5432 failed: port is already allocated`.** Na máquina de desenvolvimento, as portas padrão já estavam ocupadas pelo stack ZapFlow (Postgres 5432, Redis 6379, MinIO 9000/9001, Mailpit 1025/8025) e por um PostgreSQL instalado no Windows (5432). **Correção:** as portas publicadas no host passaram a ser configuráveis por variáveis `FORWARD_*` no `.env`, com padrões livres (5434, 6380, 9010, 9011, 1026, 8026). As portas internas não mudaram, então `DB_PORT`, `REDIS_PORT`, `AWS_ENDPOINT` e `MAIL_PORT` do Laravel continuam iguais. **Decisão:** remapear em vez de parar os outros stacks, para os projetos rodarem ao mesmo tempo.
- **2026-11-01 — `app`, `worker` e `reverb` ficavam reiniciando em loop.** Havia três causas: (1) o Composer recusa todas as versões `laravel/framework` 11.9 a 11.57.1 por causa de security advisories (`PKSA-*`); (2) não havia `composer.lock`; (3) os três contêineres rodavam `composer install` ao mesmo tempo no mesmo `./backend` montado. **Correção:** o backend foi migrado para **Laravel 12** (`^12.0`, instalado 12.70.2; Reverb 1.12, Sanctum 4.3, Tinker 2.11, PHPUnit 11.5), o `composer.lock` foi gerado e versionado, e o `entrypoint.sh` agora instala dependências só no `app` (`COMPOSER_INSTALL=true`); `worker` e `reverb` aguardam o `vendor/autoload.php` aparecer (limite de 10 min). O entrypoint também reinstala quando o `composer.lock` é mais novo que o vendor. **Ajustes junto:** os serviços PHP passaram a receber o `.env` da raiz via `env_file` (antes não chegava `APP_KEY` nenhum ao Laravel); foi criada a classe base `App\Http\Controllers\Controller`, que não existia e quebrava todos os controllers da API; e foi criado o `.gitattributes` forçando LF em `*.sh` e `backend/artisan`, porque o repositório usa `core.autocrlf=true` e um script com CRLF quebra o contêiner. **Validação:** zero reinícios após 45 s, `GET /up` → 200, `php artisan --version` → 12.70.2.

- **2026-11-01 — `app/Models/AdditionalModels.php` violava o PSR-4.** O arquivo tinha 10 classes (`UserProfile`, `UserDevice`, `TrustedContact`, `DriverDocument`, `DriverVehicle`, `ServiceArea`, `RideOffer`, `RideChatMessage`, `SafetyIncident`, `AuditLog`), e o Composer não as carregava (`Class "App\Models\UserProfile" not found`). **Correção:** um arquivo por classe em `app/Models/`, com conteúdo idêntico; o `AdditionalModels.php` foi removido.
- **2026-11-01 — Modelos com UUID ficavam com `id = null` após `create()`.** Todos os 18 modelos usavam `$keyType = 'string'` + `$incrementing = false`, deixando o banco gerar o UUID (`uuid_generate_v4()`). Como a chave não é auto-incremento, o Eloquent não lê o id de volta, e `UserProfile::create(['user_id' => $user->id])` falhava com `null value in column "user_id"`. **Correção:** trait `HasUuids` em todos os modelos; o UUID passa a ser gerado pela aplicação (UUIDv7, ordenável). O default no banco continua valendo para inserts feitos fora do Eloquent.
- **2026-11-01 — Testes sem configuração nem banco isolado.** Não havia `phpunit.xml`, e os testes de feature rodavam contra o banco de dev sem tabelas. **Correção:** criado o `backend/phpunit.xml` (suítes Unit e Feature) apontando para o banco **`voztri_test`** (PostgreSQL, porque as migrations exigem PostGIS e `uuid-ossp`; SQLite não serve); `RefreshDatabase` no `AuthTest`. O banco é criado por `infrastructure/docker/postgres-init/01-create-test-database.sql`, montado em `/docker-entrypoint-initdb.d`, que só roda na criação do volume. Em volumes antigos, rodar o mesmo SQL à mão (comando no README). **Pegadinha:** o `docker-compose` injeta o `.env` como variáveis reais do contêiner, e o Laravel lê `$_SERVER` antes de `$_ENV`; `<env force="true">` sozinho **não** basta. O `phpunit.xml` usa `<server force="true">` + `<env force="true">`. Na primeira tentativa, só com `<env>`, os testes rodaram em `voztri_db` e o `RefreshDatabase` aplicou as migrations nele (o banco estava vazio, sem perda de dados). **Validação:** `vendor/bin/phpunit` → 12/12 testes, 35 asserções; `voztri_test` com as 6 migrations.

## 7. Pendências Técnicas Conhecidas

- `php artisan test` não existe porque o projeto não tem `nunomaduro/collision`. Use `vendor/bin/phpunit`.

## 8. Próximos Passos
- Execução sequencial das Fases conforme `PASSOS.md`:
  - Fase 1: Fundação & Autenticação (Models, Migrations, Seeders, Auth API e Telas Iniciais).
  - Fase 2: Geolocalização e Rastreamento em Tempo Real (Mapas, OSRM, PostGIS, Reverb).
  - Fase 3: App do Motorista (Onboarding, Documentos, Dashboard, Toggle Online/Offline).
  - Fase 4: App do Passageiro (Home com Mapa, Categorias, Busca de Destino, Estimativa).
  - Fase 5: Motor de Despacho & Máquina de Estados da Corrida.
  - Fase 6: Sistema Financeiro, Pagamentos e Ledger Imutável.
  - Fase 7: Experiência Completa (Chat WebSocket, SOS Emergência, Avaliações, Cupons).
  - Fase 8: Painel Administrativo Master (Live Map, Gestão de Usuários, Tarifas, Auditoria).
  - Fase 9: Qualidade, Testes Automatizados e Resiliência.
  - Fase 10: Preparação e Build Android (APK/AAB, permissões em segundo plano).
  - Fase 11: Conformidade e Preparação Multiplataforma iOS.

