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

- **2026-11-01 — `php artisan key:generate` falhava com `file_get_contents(/var/www/html/.env): No such file or directory`, e o `APP_KEY` era inválido.** O Laravel recebe o `.env` da raiz pelo `env_file`; não existe `backend/.env`, que é onde o `key:generate` grava. Além disso, o `APP_KEY` versionado (`base64:VOZTRISuperSecret...`) não decodificava para 32 bytes, e qualquer `encrypt()`, cookie ou sessão falhava com `Unsupported cipher or incorrect key length`. **Correção:** gerada uma chave válida com `key:generate --show`, gravada no `.env` da raiz e os contêineres PHP recriados (`encrypt()`/`decrypt()` validados). O `.env.example` passou a ter `APP_KEY=` vazio, com o comando de geração. README e DOCUMENTACAO foram atualizados com o fluxo `--show` + `--force-recreate`. **Decisão:** não montar `.env` dentro de `backend/`, para manter uma fonte única de variáveis. Também foi removido o `config:cache` do setup de desenvolvimento: com a configuração em cache, os testes ignorariam o `phpunit.xml` e o `RefreshDatabase` apagaria o `voztri_db`.

- **2026-11-01 — Painel admin-web conectado à API real.** O painel era todo estático, com dados fixos nas telas. **Implementado:** login por OTP (`LoginScreen`, aceita só `role === 'admin'`, token no `localStorage`, validado com `/auth/me` ao recarregar, logout automático em qualquer 401); telas Dashboard (`/admin/stats`, atualiza a cada 30 s), Operações ao Vivo (`/admin/live-map`, a cada 10 s), Motoristas (`/admin/drivers`, com aprovar, bloquear e reativar), Corridas (`/admin/rides`) e Auditoria (`/admin/audit-logs`), todas com paginação, estados de carregamento, erro e vazio. Os endpoints de admin foram para o pacote compartilhado (`packages/api-client/src/endpoints/admin.ts`, classe `AdminApi` e tipos). **Decisões:** (1) **porta 3010**, porque a 3000 está ocupada por outro stack (configurável em `ADMIN_WEB_PORT`); (2) o **proxy do Vite** encaminha `/api` → `http://localhost:8080`, então o navegador chama a mesma origem e não depende de CORS (`VITE_API_URL` e `VITE_API_PROXY_TARGET` permitem trocar o destino); (3) o admin-web é **instalado isolado** (`npm install --workspaces=false`, com `package-lock.json` próprio), porque a instalação pelo workspace falha num conflito de peer dependency dos apps mobile (`react-native@0.74` exige `react@18.2.0`, mas eles declaram `^18.3.1`). Os pacotes `@voztri/*` nunca tiveram build (`dist/`) e entram pelo `src` via aliases no `vite.config.ts` e `paths` no `tsconfig.json`; `resolve.dedupe` faz o `axios` do `api-client` vir do `node_modules` do admin-web. (4) As seções "Distribuição por Categoria" e "Central SOS" do dashboard tinham números inventados e agora dizem explicitamente que ainda não há endpoint.
- **2026-11-01 — Escalonamento de privilégio no `request-otp`.** A validação aceitava `role: "admin"` vindo do cliente, e qualquer telefone novo virava administrador (com o OTP fixo `123456`, acesso total ao painel). **Correção:** `role` aceita só `passenger` ou `driver`; administradores existem apenas via seed. Teste: `AuthTest::test_cannot_self_register_as_admin`.
- **2026-11-01 — `request-otp` criava registro de passageiro para admin e motorista.** O código usava o `role` da requisição (padrão `passenger`) em vez do papel salvo no usuário, e o admin do seed ganhou um registro em `passengers` ao logar (o `passengers_count` foi de 1 para 2). **Correção:** o papel passa a vir de `$user->role`; o registro indevido foi removido do banco de dev. Teste: `AuthTest::test_existing_admin_login_does_not_create_passenger_record`.
- **2026-11-01 — `GET /admin/audit-logs` daria 500 assim que existisse um log.** O controller fazia `AuditLog::with('user')`, mas o modelo não tinha a relação `user()`; só não quebrava porque a tabela estava vazia. **Correção:** relação `belongsTo(User::class)` adicionada. Teste: `AdminApiTest`.
- **2026-11-01 — Imports não usados em `packages/api-client/src/endpoints/driver.ts` e `packages/shared-types/src/billing.ts`** quebravam o `tsc` com `noUnusedLocals`; foram removidos.
- **Validação:** `vendor/bin/phpunit` → 16/16 testes (47 asserções); `tsc --noEmit` e `vite build` do admin-web sem erros; fluxo ponta a ponta pelo proxy `localhost:3010/api` (login do admin, `/auth/me`, stats, motoristas, bloquear e aprovar, auditoria com o operador, live-map, 401 com token inválido, 403 para passageiro). O teste visual no navegador não foi feito: a extensão do Chrome não conectou, por estar logada em outra conta do claude.ai.

- **2026-11-01 — `npm install` na raiz falhava com `ERESOLVE`.** Todas as versões 0.74.x do `react-native` exigem `react` exatamente `18.2.0` (peer dependency), mas `driver-mobile` e `passenger-mobile` declaravam `react@^18.3.1`. **Correção:** `react@18.2.0` fixado nos dois apps mobile e também no admin-web (`react` e `react-dom`), para o monorepo ter **uma única cópia do React** (`npm ls react` mostra só `18.2.0`, deduplicada). A 18.3 só acrescentava avisos de depreciação, que o painel não usa. Com isso, o admin-web **voltou para o workspace**: o `package-lock.json` e o `node_modules` próprios foram removidos, as dependências `@voztri/*` voltaram ao `package.json` e saiu o `paths` de `axios` do `tsconfig`. A instalação agora é `npm install` na raiz (652 pacotes, sem `--force` nem `--legacy-peer-deps`), e o painel sobe com `npm run dev -w @voztri/admin-web`. **Regra:** não subir o React de um app isoladamente enquanto os mobile estiverem no RN 0.74. **Validação:** `npm install` com exit 0; build do admin-web (tsc + vite) ok; painel em `localhost:3010` com login e stats via proxy ok.

- **2026-11-01 — Typecheck do monorepo voltou a passar (`npm run typecheck` na raiz, 8 de 8 workspaces).** Havia 8 erros no `driver-mobile`, 11 no `passenger-mobile` e mais 5 nos pacotes, que só ficaram visíveis depois que o `npm install` passou a funcionar. **Correções:** (1) `tsconfig.json` dos dois apps mobile ganhou `paths` para os 5 pacotes `@voztri/*` (`api-client`, `design-tokens`, `localization`, `shared-types`, `validation`) apontando para o `src`, como no admin-web; saíram `rootDir`/`outDir` e entrou `noEmit`, porque quem compila os apps é o bundler e o `rootDir: ./src` recusaria os arquivos de `../../packages`. (2) Removidas as variáveis não usadas: `isInProgress` (`EnRouteNavigationScreen.tsx`), `origin` e o import de `usePassengerStore` (`HomeScreen.tsx`) e o parâmetro `reason` da implementação mock de `cancelActiveRide` (a interface mantém `(reason: string) => void`, porque o `App.tsx` passa o motivo e a futura chamada à API vai usá-lo). (3) `packages/localization`: o `t()` retornava `typeof ptBR`, com os literais em português por causa do `as const`, e o `enUS` não era atribuível. Foi criado o tipo `Translation` (mesma estrutura do pt-BR, valores `string`), e o `translations` foi anotado com `Record<SupportedLocale, Translation>`, o que também acusa chaves faltando em en-US/es-ES. (4) `packages/api-client`: o typecheck usa o novo `tsconfig.typecheck.json` (`paths` para o `shared-types/src`, `rootDir: ..`, `noEmit`). O `tsconfig.json` de build ficou intacto, porque o `rootDir: ./src` não pode conter arquivos de outro pacote.

- **2026-11-01 — `npm run build` na raiz falhava no `api-client`** (`Cannot find module '@voztri/shared-types'`). O `npm run build --workspaces` executa na ordem em que os globs de `workspaces` são expandidos (alfabética), então o `api-client` compilava antes do `shared-types`, cujo `dist/index.d.ts` ele precisa. **Correção:** `"packages/shared-types"` foi declarado antes de `"packages/*"` em `workspaces`, no `package.json` da raiz. O npm deduplica a entrada repetida (8 workspaces únicos; `shared-types` compila uma vez só), e a ordem vira shared-types → api-client → design-tokens → localization → validation → admin-web. **Por que não project references do TypeScript (`tsc -b`):** resolveria o mesmo problema com bem mais configuração (`composite`, `references` em cada pacote); fica como opção se surgirem mais dependências entre pacotes. **Regra:** se outro pacote passar a depender de um pacote que vem depois dele em ordem alfabética, declarar a dependência antes de `packages/*` da mesma forma. **Junto:** o `design-tokens` declarava `"module": "./dist/index.mjs"`, que o `tsc` nunca gera; o campo foi removido, porque bundlers que dão preferência a `module` quebrariam ao importar o pacote compilado. **Validação:** build limpo (sem nenhum `dist/`) com exit 0; `npm run typecheck` sem erros; `npm install` "up to date" (o lockfile só ganhou a nova lista de workspaces).

- **2026-11-01 — Metro passou a resolver os pacotes `@voztri/*` em runtime.** O `main` dos pacotes aponta para `./dist/index.js`, que só existe depois do build. **Correção em duas partes:** (1) campo `"react-native": "./src/index.ts"` nos 5 `package.json` (`api-client`, `design-tokens`, `localization`, `shared-types`, `validation`); o Metro dá prioridade a esse campo (`resolverMainFields: react-native, browser, main`), então usa o código-fonte sem exigir build. O Vite e o `tsc` não leem o campo, então admin-web, typecheck e build não mudam. (2) **Só o campo não bastava:** um bundle de teste com o Metro 0.80.12 falhou no primeiro import interno com `Unable to resolve module ./auth.schema.js`. O código segue a convenção `NodeNext` (imports relativos com `.js` apontando para `.ts`), e o Metro 0.80 não faz essa troca. Os próprios apps mobile têm o mesmo padrão (`'../store/driverStore.js'`). Foi criado o `metro.config.js` em `driver-mobile` e `passenger-mobile` (via `@react-native/metro-config@^0.74.89`, alinhado ao `@react-native/*` do RN 0.74.7), com `watchFolders` na raiz do monorepo, `nodeModulesPaths` e um `resolveRequest` que, quando o `.js` relativo não existe, tenta o mesmo caminho sem extensão. Ele só age como fallback, então arquivos `.js` reais e o `node_modules` se resolvem como antes. **Por que não reescrever os 39 imports sem `.js`:** quebraria a convenção que o `tsc` com `NodeNext` exige e não resolveria os imports dos próprios apps. **Validação** (bundles gerados com o `metro.config.js` real de cada app, plataforma android, **sem nenhum `dist/`**): um bundle importando os 5 pacotes foi executado no Node e retornou a cor da marca, a tradução `en-US` ("Cancel"), as classes `AdminApi`/`VoztriApiClient` e as 14 exportações do `validation`; os bundles da entrada real (`src/index.tsx`) saíram com 113 KB (driver) e 138 KB (passenger). Typecheck e build da raiz continuam sem erros.

- **2026-11-01 — Ponto de entrada React Native nos apps mobile.** O `src/index.tsx` só reexportava módulos e não havia `index.js` nem `app.json`. **Implementado:** `app.json` (`driver-mobile`: `name` `VoztriDriver`, `displayName` "VOZTRI Driver"; `passenger-mobile`: `VoztriPassenger`, "VOZTRI"; os nomes de exibição seguem o `CFBundleDisplayName` dos `Info.plist`); `src/index.tsx` chama `AppRegistry.registerComponent(appName, () => App)`, com o nome lido do `app.json`, e mantém os reexports; `index.js` na raiz de cada app (entrada padrão do Metro e do Gradle no RN 0.74) só importa `./src/index`. Foi adicionado `resolveJsonModule` nos dois `tsconfig`, para o import do `app.json`. **Decisão:** o registro ficou no `src/index.tsx`, e não no `index.js` como no template, para ficar tipado junto do `App`; o `index.js` é só a porta de entrada que o Metro procura. **Nomes:** nenhum arquivo nativo definia o nome do componente. `VoztriDriver`/`VoztriPassenger` precisam ser usados no `getMainComponentName()` e no `moduleName` quando os projetos nativos forem criados. **Validação:** typecheck da raiz sem erros; bundle Android de produção gerado pelo Metro a partir do `index.js` de cada app (2,44 MB e 2,46 MB), contendo o `InitializeCore` do RN, o `registerComponent` e o nome correto. **Não validado no dispositivo**, porque os projetos nativos estão incompletos e as telas usam elementos DOM (ver pendências).

## 7. Pendências Técnicas Conhecidas

- **Apps "mobile" usam JSX de web, não React Native:** as telas de `driver-mobile` e `passenger-mobile` renderizam `<div>`, `<header>`, `<button>` e `style` de CSS, em vez de `View`, `Text` e `Pressable`. O typecheck passa porque o `@types/react` aceita elementos DOM, mas o app não roda no React Native/Metro. As telas precisam ser portadas para os componentes do RN.
- **Projetos nativos incompletos (impede instalar os apps):** `driver-mobile/android` só tem `app/build.gradle` e `AndroidManifest.xml`, além de caches do Gradle. Faltam `settings.gradle`, o `build.gradle` raiz (que define `rootProject.ext.*`), `gradlew`, `MainActivity`, `MainApplication` e `res/` (`@string/app_name`, `@mipmap/ic_launcher`, `@style/AppTheme`, citados no manifest). O manifest também cita um `.services.LocationTrackingService` que não existe. `passenger-mobile` **não tem a pasta `android/`**. Em `ios/`, os dois só têm o `Info.plist` (sem `.xcodeproj`, `Podfile` nem `AppDelegate`). Caminho sugerido: gerar o template RN 0.74.7 (`npx @react-native-community/cli@13 init`) numa pasta temporária e trazer `android/` e `ios/`, mantendo `applicationId`/`CFBundleIdentifier` (`br.com.voztri.driver` / `br.com.voztri.passenger`), as permissões já declaradas e `getMainComponentName()`/`moduleName` = `VoztriDriver` / `VoztriPassenger`.
- **Login do painel com telefone desconhecido cria um passageiro:** o painel usa o `request-otp` público, que faz `firstOrCreate`. Um endpoint de OTP só para admins resolveria isso.
- **`average_rating` é fixo (4.88) no `AdminController::getStats`.** O painel avisa que o valor é provisório.
- **Faltam endpoints para o dashboard:** volume por categoria e incidentes SOS (`safety_incidents`).
- **`approveDriver` não religa o `is_online`** depois de um bloqueio, então o motorista reativado some do mapa ao vivo até ficar online de novo pelo app.
- **Tipos do `shared-types` em camelCase** (`avatarUrl`, `expiresInSeconds`), mas a API responde em snake_case (`avatar_url`, `expires_in_seconds`). O painel usa só `name` e `role`, que coincidem.

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

