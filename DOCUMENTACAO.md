# VOZTRI — Documentação Técnica Completa

Bem-vindo à documentação oficial da plataforma de mobilidade urbana **VOZTRI**. Esta plataforma foi projetada para atender ao mercado brasileiro com altos padrões de escalabilidade, conformidade com a LGPD e Lei nº 13.640/2018, utilizando prioritariamente tecnologias open source e uma experiência de usuário premium baseada na identidade visual proprietária.

---

## 1. Visão Arquitetural

A VOZTRI opera com um **monolito modular** no backend para garantir coerência transacional e baixa sobrecarga operacional, complementado por serviços dedicados em Docker para filas, WebSockets, banco geoespacial e cache:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENTES MÓVEIS & WEB                         │
│   ┌─────────────────────┐ ┌───────────────────┐ ┌──────────────────┐   │
│   │  Passageiro Mobile  │ │  Motorista Mobile │ │   Admin Web      │   │
│   │   (React Native)    │ │   (React Native)  │ │  (React + Vite)  │   │
│   └──────────┬──────────┘ └─────────┬─────────┘ └────────┬─────────┘   │
└──────────────┼──────────────────────┼────────────────────┼─────────────┘
               │ HTTPS                │ HTTPS & WSS        │ HTTPS
               ▼                      ▼                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NGINX (Reverse Proxy & SSL)                     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌─────────────────────────────────┐        ┌─────────────────────────────┐
│    Backend REST API (Laravel)   │◄──────►│  Laravel Reverb (WebSocket) │
│ - DDD Modular (Domain/App/Infra)│        │  - Localização em tempo real│
│ - Sanctum Auth & Rate Limiting  │        │  - Ofertas e Despacho       │
│ - Máquina de Estados da Corrida │        │  - Chat e Alertas SOS       │
└────────────────┬────────────────┘        └──────────────┬──────────────┘
                 │                                        │
        ┌────────┴───────────────┬────────────────────────┘
        ▼                        ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐
│  PostgreSQL + PostGIS│  │  Redis 7 (In-Memory) │  │   OSRM / Photon    │
│  - Consultas GiST    │  │  - GEOADD motoristas │  │  - Rotas locais    │
│  - Ledger financeiro │  │  - Cache e Filas     │  │  - Geocodificação  │
│  - Auditoria & Logs  │  │  - Locks Concorrentes│  │  - Custo zero API  │
└──────────────────────┘  └──────────────────────┘  └────────────────────┘
```

---

## 2. Requisitos de Ambiente

- **Docker**: versão 24.0+ ou superior com Docker Compose v2.
- **Node.js**: versão 20 LTS ou 22 LTS (para desenvolvimento local dos apps e web).
- **Git**: para versionamento de código.
- **Android Studio** (opcional, para compilação local dos APKs Android com Java 17).

---

## 3. Instruções de Instalação e Inicialização com Docker

Para iniciar toda a infraestrutura backend e banco de dados:

```bash
# 1. Clone o repositório e acerte as permissões
cd d:/PROJETOS/VOZTRI

# 2. Copie o arquivo de variáveis de ambiente
cp .env.example .env

# 3. Suba todos os containers com build automatizado
docker compose up -d --build

# 4. Gere a chave de criptografia (o .env fica na raiz, não em backend/,
#    então use --show e cole o valor em APP_KEY= no .env da raiz)
docker compose exec app php artisan key:generate --show

# 5. Recrie os contêineres PHP para lerem a nova APP_KEY
docker compose up -d --force-recreate app worker reverb

# 6. Execute as migrations com tabelas espaciais e dados de exemplo (Seeds)
docker compose exec app php artisan migrate --seed
```

> **Não use `php artisan config:cache` em desenvolvimento:** com a configuração em cache, os testes ignoram o `phpunit.xml`, rodam no `voztri_db` e o `RefreshDatabase` apaga os dados dele.

### URLs de Acesso aos Serviços Locais:
- **API REST**: `http://localhost:8080/api/v1`
- **Painel Administrativo Web**: `http://localhost:3010` (subir com `npm install && npm run dev -w @voztri/admin-web` na raiz; login do seed: telefone `(11) 99999-0000`, código `123456`)
- **Servidor WebSocket Reverb**: `ws://localhost:8081`
- **Mailpit (Caixa postal local para OTPs/Emails)**: `http://localhost:8026`
- **MinIO Console (Storage S3 local de fotos/documentos)**: `http://localhost:9011` (Usuário: `voztri_admin`, Senha: `voztri_password_safe`)
- **PostgreSQL / PostGIS (clientes externos, ex.: DBeaver)**: `localhost:5434`
- **Redis (clientes externos)**: `localhost:6380`

> As portas do host são definidas pelas variáveis `FORWARD_*` do `.env`. Dentro da rede Docker os serviços seguem nas portas internas padrão.

---

## 4. Estrutura dos Pacotes Compartilhados (`packages/`)

- `@voztri/design-tokens`: Contém a paleta de cores oficial (`#6A00FF`, `#9B4DFF`, `#0B1026`), fontes Montserrat, espaçamentos, raio de borda e temas claro/escuro.
- `@voztri/shared-types`: Definições TypeScript rigorosas para `User`, `Passenger`, `Driver`, `Ride`, `RideStatus`, `FareEstimate`, `PaymentMethod`, `LedgerTransaction` e `Location`.
- `@voztri/validation`: Esquemas de validação Zod para autenticação, solicitação de corridas, cadastro de CNH/veículo e dados bancários.
- `@voztri/localization`: Módulos de internacionalização com suporte a Português do Brasil (`pt-BR`), Inglês (`en-US`) e Espanhol (`es-ES`).
- `@voztri/api-client`: Cliente HTTP construído sobre Axios com renovação de token JWT/Sanctum, retry automático, tratamento de offline e injeção de `Idempotency-Key`.

---

## 5. Principais Rotas da API REST (`/api/v1`)

### Autenticação & Usuários
- `POST /api/v1/auth/request-otp`: Envia código OTP de 6 dígitos para o número informado.
- `POST /api/v1/auth/verify-otp`: Valida o OTP e retorna token Bearer Sanctum.
- `POST /api/v1/auth/admin/request-otp`: Login do painel administrativo. Só gera código para administradores ativos já existentes e **nunca cria usuário**. A resposta é sempre a mesma (`"Se o telefone pertencer a um administrador..."`), para não revelar quais telefones são de admins. Body: `{ "phone": "11999990000" }`.
- `POST /api/v1/auth/admin/verify-otp`: Valida o OTP do painel e só emite token para administradores ativos; qualquer outro usuário recebe `422 INVALID_OTP`, mesmo com código válido do fluxo público. Body: `{ "phone": "...", "code": "123456" }`.
  - As duas rotas `/auth/admin/*` têm limite de **5 requisições por minuto por IP, somadas** (`throttle:5,1`); acima disso respondem `429`.
- `GET /api/v1/auth/me`: Retorna perfil do usuário logado e suas permissões.

> As rotas de `/rides/*` e `/driver/*` são usadas pelos apps mobile e respondem em `camelCase`, no formato dos tipos de `packages/shared-types` (`Ride`, `DriverCurrentState`, `DriverEarningsSummary`, `ChatMessage`). A corrida é montada pelo `RidePresenter`: o **PIN de embarque só vai para o passageiro dono** e não há CPF, telefone nem PIN de emergência dos participantes. Erros vêm como `{ "message": "...", "error": "CODIGO" }`.

### Fluxo de despacho (ofertas por polling)

`REQUESTED → SEARCHING → OFFERED → ACCEPTED → DRIVER_EN_ROUTE → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED` (ou `CANCELLED`), com todas as transições pela `RideStateMachine`, que grava `ride_status_history`.

1. O passageiro solicita: a corrida é oferecida ao motorista **online, aprovado, livre e da mesma categoria mais próximo** do embarque (`ride_offers`, validade de **15 s**).
2. O app do motorista consulta `GET /driver/rides/current` a cada 3 s e mostra a oferta.
3. Aceite → `DRIVER_EN_ROUTE`. Recusa ou expiração → volta para `SEARCHING` e vai ao próximo motorista (quem já recebeu essa corrida não a recebe de novo). Sem motoristas, fica em `SEARCHING` até o passageiro cancelar.
4. Não há worker: ofertas vencidas são tratadas no polling do passageiro (`GET /rides/{id}`) e do motorista.

### Motorista
- `POST /api/v1/driver/register`: Cadastro de dados complementares e veículo.
- `POST /api/v1/driver/documents`: Envio de CNH e CRLV para análise.
- `POST /api/v1/driver/status`: Body `{ "isOnline": true }`. Só motoristas `approved` ficam online (403 `DRIVER_NOT_APPROVED`).
- `GET /api/v1/driver/rides/current`: Polling do app: `{ isOnline, offer, ride }`. `offer` traz `rideId`, `secondsLeft`, endereços, `earningsCents` (líquido, após 15%), `categoryName` e `passengerName`; `ride` é a corrida em andamento.
- `POST /api/v1/driver/location`: Transmite coordenadas de GPS (`latitude`, `longitude`, `heading`, `speed`).
- `GET /api/v1/driver/earnings`: Ganhos **líquidos** do ledger: `todayCents`, `weekCents`, `daily` (segunda a domingo, com `isToday`), `ridesCount`, `availableBalanceCents`, `rating`, `pixKey`, `pixKeyType`. `onlineHours` ainda é `null`.

### Passageiro & Corridas
- `POST /api/v1/rides/estimate`: Estimativa das 4 categorias pela distância Haversine × 1,35 (fator urbano) a 28 km/h, com o mesmo cálculo da cobrança (`FareCalculator`).
- `POST /api/v1/rides/request`: Só passageiros. Body `{ origin, destination, category, paymentMethod }` (endereço e coordenadas). Cobra o valor da estimativa, gera PIN aleatório e já despacha. 409 `RIDE_ALREADY_ACTIVE` (com a corrida em `ride`) se houver outra em andamento.
- `GET /api/v1/rides/{id}`: Participantes, motorista que recebeu oferta ou admin. Também faz a corrida avançar no despacho.
- `POST /api/v1/rides/{id}/accept`: Motorista que recebeu a oferta (403 `NO_OFFER`; 409 `OFFER_EXPIRED`, `RIDE_UNAVAILABLE` ou `DRIVER_BUSY`). Lock atômico.
- `POST /api/v1/rides/{id}/reject`: Motorista recusa a oferta; a corrida segue para o próximo.
- `POST /api/v1/rides/{id}/validate-pin`: Motorista atribuído valida o PIN informado pelo passageiro e inicia a viagem (422 `INVALID_PIN`; 409 fora de `DRIVER_EN_ROUTE`/`DRIVER_ARRIVED`).
- `POST /api/v1/rides/{id}/complete`: Motorista atribuído, só em `IN_PROGRESS`. Lança no ledger o líquido do motorista e a comissão de 15%.
- `POST /api/v1/rides/{id}/cancel`: Passageiro dono ou motorista atribuído, com `reason`. Recolhe a oferta pendente.
- `POST /api/v1/billing/rating`: Passageiro dono, só corrida `COMPLETED`, uma vez (409 `ALREADY_RATED`). Atualiza a média do motorista.
- `POST /api/v1/billing/payout`: Repasse Pix do motorista; recusa valor acima do saldo (422 `INSUFFICIENT_BALANCE`). Mínimo R$ 10,00.

### Chat & Emergência (SOS)
- `GET|POST /api/v1/rides/{id}/chat`: Histórico e envio (`{ "message": "..." }`) entre os participantes da corrida; mensagens no formato `ChatMessage` (`text`, `senderRole`). Os apps atualizam por polling.
- `POST /api/v1/rides/{id}/sos`: Passageiro dono aciona o alerta com `latitude`/`longitude` (o app envia o embarque, pois ainda não lê o GPS).
- `POST /api/v1/rides/{id}/sos/cancel`: Desativa com o PIN de emergência do passageiro (`emergencyPin`; 422 `INVALID_EMERGENCY_PIN`).

---

## 6. Conformidade Legal e LGPD

1. **Minimização de Dados**: Coordenadas de GPS dos motoristas são apagadas da memória operacional após a desconexão ou término da corrida, mantendo apenas a polilinha histórica resumida para auditoria fiscal e segurança.
2. **Lei nº 13.640/2018**: O backend valida seguro APP (Acidentes Pessoais a Passageiros), CNH na categoria EAR (Exerce Atividade Remunerada) e antecedentes criminais antes da ativação do motorista.
3. **Ledger Imutável**: Nenhuma transação financeira pode ser editada ou deletada. Erros são corrigidos exclusivamente através de lançamentos compensatórios de estorno.

