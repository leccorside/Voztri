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
- `@voztri/mobile-core`: Código compartilhado pelos apps React Native. Pacote só de código-fonte (sem build), com `@react-native-firebase/*`, `react` e `react-native` como `peerDependencies`; não deve ser importado pelo admin-web. Tem testes próprios (`npm test -w @voztri/mobile-core`, Jest com preset `react-native`); os apps testam só o que é deles (filtro de push, chaves do AsyncStorage, telas).
  - `API_URL` (padrão `DEFAULT_API_URL`: `http://10.0.2.2:8080/api/v1` no emulador Android, `http://localhost:8080/api/v1` no iOS) e `POLL_INTERVAL_MS` (3 s). O `API_URL` pode vir da variável de ambiente **`VOZTRI_API_URL`**, embutida no bundle pelo `babel-plugin-transform-inline-environment-variables` (só essa variável, via `include`) e normalizada por `resolveApiUrl()` (exige `http(s)://`, remove a barra final; inválida avisa e usa o padrão). O `metro.config.js` inclui o valor no `cacheVersion` e o `app/build.gradle` o declara como entrada das tarefas `createBundle*JsAndAssets`, então trocar o valor refaz o bundle; o `jest.config.js` remove a variável para os testes usarem sempre o padrão. Uso no README ("Testando num aparelho físico"). Os `src/config.ts` dos apps reexportam esses valores e guardam os próprios (as constantes de envio da localização ficam no do motorista).
  - `createPushController(deviceApi)`: notificações push (Firebase opcional, permissão, registro e renovação do token, ouvintes de mensagem, proteção contra logout no meio do registro e revogação); cada app só filtra as mensagens que lhe interessam no seu `src/push.ts`.
  - `createMobileApi({ baseURL, storage, tokenKey, clearKeys?, onClockSample? })`: sessão (token em memória + AsyncStorage injetado, com `current()` para o serviço nativo e chaves extras apagadas no logout), `VoztriApiClient` autenticado, handler de 401 substituível (`onUnauthorized`) e `errorMessage` com o endereço da API. Também exporta `createSession`, `apiErrorCode`, `httpStatus`, `errorBody` e `errorMessageFor`. Cada app monta no seu `src/api.ts` só as APIs que usa (`AuthApi`, `RideApi`...) e o que é dele (ex.: `activeRideMemory` do passageiro).
  - `usePolling(fn, intervalMs, enabled)`: executa `fn` na hora e depois a cada intervalo, sem sobrepor chamadas e pausando com o app em segundo plano.
  - Kit de UI: `Button` (`Pressable` com feedback e acessibilidade), `BottomSheetModal` (folha inferior; "voltar" do Android fecha), `Banner` (aviso de erro ou de conexão), `shadow()` (sombra iOS + `elevation` Android) e `formatBRL()` (centavos em reais, sem `Intl`).
  - `OtpLoginScreen`: login por código SMS (telefone → código, com o código de depuração em desenvolvimento e "Trocar telefone"). Não conhece store: recebe `requestCode`, `login`, `busy` e `error`. A prop `role` (`'driver' | 'passenger'`) escolhe textos e tema (motorista: "Entrar como motorista", selo "Driver", fundo escuro; passageiro: "Entrar na VOZTRI", sem selo, fundo claro); `texts` sobrescreve título, instrução e selo. Cada app liga o próprio store no seu `src/screens/LoginScreen.tsx`.
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
3. Aceite → `DRIVER_EN_ROUTE`. Recusa ou expiração → volta para `SEARCHING` e vai ao próximo motorista (quem já recebeu essa corrida não a recebe de novo). Sem motoristas, a corrida fica em `SEARCHING` (e é reoferecida a quem ficar online) até o prazo da busca.
4. **Timeout da busca:** **3 min** depois da solicitação (`RideDispatcher::SEARCH_TIMEOUT_SECONDS`), a corrida que estiver ou voltar a `SEARCHING` vira `NO_DRIVER_AVAILABLE` (histórico com `reason: search_timeout`) em vez de ir ao próximo motorista, e o passageiro recebe o push "Nenhum motorista disponível". Uma oferta válida no vencimento **não é interrompida**: se o motorista aceitar, a corrida segue; se recusar ou deixar vencer, a busca termina. O prazo é conferido no polling e por um job atrasado (`ExpireRideSearch`, agendado na solicitação para o vencimento e reagendado para logo depois da oferta em andamento), então funciona mesmo com o app do passageiro minimizado. Ofertas vencidas também são tratadas no polling do passageiro (`GET /rides/{id}`) e do motorista.
5. Cada oferta nova também gera um **push** para o motorista (job `SendRideOfferPush` na fila, depois do commit; ver abaixo). O push e o timeout da busca sem polling precisam do contêiner `worker`.

### Notificações push (novas ofertas)

- Envio pela **API HTTP v1 do Firebase Cloud Messaging** para Android e iOS. No iOS o FCM repassa ao APNs com a chave `.p8` cadastrada no console do Firebase; o backend não fala com o APNs diretamente.
- **Ativação:** `FCM_CREDENTIALS` no `.env` com o caminho, dentro do contêiner, do JSON da conta de serviço (sugestão: `backend/storage/app/firebase/service-account.json`, fora do git). Sem a variável, ou com o arquivo ausente, o backend usa o `NullPushNotifier`: só registra no log e o despacho segue igual.
- **Mensagem:** título "Nova corrida: R$ X" (ganho líquido), corpo "Embarque: {endereço} • X km • responda em N s" e `data = { type: "ride_offer", rideId, expiresAt }`. A validade acompanha a oferta: `android.ttl` e `apns-expiration` iguais aos segundos restantes, para não chegar uma oferta vencida. No Android, prioridade `HIGH` e canal `ride_offers`; no iOS, `apns-priority: 10`, `interruption-level: time-sensitive` e `apns-collapse-id` (uma oferta substitui a anterior).
- **Tokens:** o token de acesso OAuth (JWT RS256 da conta de serviço) fica em cache por 55 min. Token respondido como `UNREGISTERED`, `SENDER_ID_MISMATCH` ou 404 é apagado de `user_devices`; falhas temporárias (503, `INVALID_ARGUMENT`) não apagam.
- **App do motorista:** registra o token ao entrar, remove no logout e invalida no Firebase quando a sessão expira. Com o app aberto a notificação não aparece; a mensagem só antecipa o polling. Ao tocar na notificação, o app abre e busca a oferta.
- **Passageiro (job `SendRideStatusPush`, canal Android `ride_updates`):**
  - no **aceite**: "{Nome} está a caminho" com "Marca Modelo Cor • PLACA • chega em ~X min" (tempo pela posição atual do motorista; sem posição recente, "motorista confirmado"). O aceite já coloca a corrida em `DRIVER_EN_ROUTE`, então "aceitou" e "a caminho" são **uma notificação só**;
  - na **chegada** (automática pelo `/driver/location` com distância + precisão do GPS até 100 m, ou pelo `POST /rides/{id}/arrived` a até 300 m): "Seu motorista chegou" com "{Nome} está no embarque: carro • placa. Confira a placa antes de entrar." O PIN de embarque **não** vai na notificação (ficaria visível na tela bloqueada);
  - no **cancelamento pelo motorista** (`POST /rides/{id}/cancel` feito pelo motorista atribuído): "Corrida cancelada pelo motorista" com "{Nome} cancelou a corrida. Toque para pedir outro motorista." O **motivo digitado não vai na notificação** (texto livre, visível na tela bloqueada). O cancelamento pelo passageiro não gera push; o job confere `cancelled_by` mesmo se for disparado;
  - na **conclusão** (`POST /rides/{id}/complete`): "Viagem concluída" com "Total: R$ X no Pix / no cartão / em dinheiro / com o saldo da carteira. Toque para avaliar {Nome}.", em **prioridade normal** (as outras são urgentes);
  - no **fim da busca sem motorista** (`NO_DRIVER_AVAILABLE`, ver o timeout acima): "Nenhum motorista disponível" com "Não encontramos um motorista {categoria} perto de {embarque}. Toque para tentar de novo." (urgente, validade de 30 min);
  - `data = { type: "ride_status", rideId, status }`; mesma tag/`apns-collapse-id` (`ride_{id}`), então cada aviso substitui o anterior da corrida; validade de 15 min (a caminho), 10 min (chegada), 30 min (cancelamento) e 24 h (conclusão). O job não envia se a corrida mudou de status antes de ele rodar.
  - O app do passageiro registra o token como o do motorista. Ao receber a mensagem com o app aberto, ou ao tocar na notificação, atualiza a corrida (cancelada → volta ao início com aviso; concluída → avaliação). Se não houver corrida na tela (app aberto pela notificação), passa a acompanhar a corrida do aviso se ainda estiver em andamento, abre a avaliação se estiver concluída e, se foi cancelada, mostra "O motorista cancelou a corrida. Peça um novo motorista quando quiser."

### Aparelhos (push)

- `POST /api/v1/devices`: Body `{ "token": "<token FCM>", "platform": "android" | "ios", "deviceId"?: "..." }`. Registra ou atualiza o aparelho do usuário logado (`201 { id, platform }`). O token é único: se outra conta entrar no mesmo aparelho, ele passa para ela.
- `DELETE /api/v1/devices`: Body `{ "token": "..." }`. Remove o token da conta (logout). `204`.

### Motorista
- `POST /api/v1/driver/register`: Cadastro de dados complementares e veículo.
- `POST /api/v1/driver/documents`: Envio de CNH e CRLV para análise.
- `POST /api/v1/driver/status`: Body `{ "isOnline": true }`. Só motoristas `approved` ficam online (403 `DRIVER_NOT_APPROVED`).
- `GET /api/v1/driver/rides/current`: Polling do app: `{ isOnline, offer, ride }`. `offer` traz `rideId`, `secondsLeft`, endereços, `earningsCents` (líquido, após 15%), `categoryName` e `passengerName`; `ride` é a corrida em andamento.
- `POST /api/v1/driver/location`: Posição do GPS enviada pelo app enquanto o motorista está online (na hora ao andar mais de 200 m; em movimento, a partir de 25 m, no máximo a cada 10 s; **parado, a cada 2 min**: o "batimento" que mantém o `last_location_at` recente, já que posição com mais de 10 min manda o motorista para o fim da fila). A mesma regra vale no `LocationTrackingService` (Android), no `VoztriLocationTracking` (iOS) e no envio pelo JS. Body `{ latitude, longitude, heading?, speed?, accuracy? }`; `heading` em 0–360, `speed` ≥ 0 e `accuracy` (raio de incerteza do GPS, em metros) ≥ 0; valores desconhecidos são omitidos. Atualiza `current_latitude`, `current_longitude` e `last_location_at`. **Chegada automática:** se o motorista tem corrida em `DRIVER_EN_ROUTE` e **distância ao embarque + `accuracy` ≤ 100 m** (distância geodésica no PostGIS; o círculo de incerteza inteiro precisa caber no raio; **sem `accuracy`, não há chegada automática**), a corrida vai para `DRIVER_ARRIVED` e o passageiro recebe o push; vale também para o envio do serviço nativo em segundo plano. Resposta: `{ success, arrivedAtPickup, rideId }` (`rideId` só quando esta posição marcou a chegada). O histórico (`ride_status_history.metadata`) guarda `source` (`auto` ou `manual`), `distance_m` e, na automática, `accuracy_m`. No despacho, posição com mais de **10 minutos** é tratada como desconhecida (o motorista vai para o fim da fila).
- `GET /api/v1/driver/earnings`: Ganhos **líquidos** do ledger: `todayCents`, `weekCents`, `daily` (segunda a domingo, com `isToday`), `ridesCount`, `availableBalanceCents`, `rating`, `pixKey`, `pixKeyType`. `onlineHours` ainda é `null`.

### Passageiro & Corridas
- `POST /api/v1/rides/estimate`: Estimativa das 4 categorias pela distância Haversine × 1,35 (fator urbano) a 28 km/h, com o mesmo cálculo da cobrança (`FareCalculator`).
- `POST /api/v1/rides/request`: Só passageiros. Body `{ origin, destination, category, paymentMethod }` (endereço e coordenadas). Cobra o valor da estimativa, gera PIN aleatório e já despacha. 409 `RIDE_ALREADY_ACTIVE` (com a corrida em `ride`) se houver outra em andamento.
- `GET /api/v1/geo/search?q=&latitude=&longitude=`: Busca de destino pelo texto (mínimo de 3 letras), perto do passageiro. Autenticado, limite de 60/min por usuário (o app espera 400 ms sem digitação antes de chamar). Resposta `{ results: [{ address, shortAddress, city, state, latitude, longitude }] }`, com o **nome do lugar como `shortAddress`** quando existe ("Morumbi Shopping") e o endereço da rua em `address` ("Avenida Roque Petroni Júnior, 1089 - Vila Cordeiro, São Paulo - SP"); sem repetidos; até 6 resultados; lista vazia quando nada foi encontrado; 503 `GEOCODING_UNAVAILABLE` com o provedor fora do ar (nunca resultados inventados). A posição de referência é **arredondada a 2 casas (~1 km)** e a busca fica limitada a um quadrado de ±0,5° (~55 km) em volta dela (`bbox`); sem isso, "congonhas" devolvia cidades de Minas Gerais. Buscas ficam 1 h em cache (texto normalizado + posição arredondada). Provedor: `AddressSearch` → `PhotonGeocodingService::search()`.
- `GET /api/v1/geo/reverse?latitude=&longitude=`: Endereço de uma coordenada (embarque pelo GPS do passageiro). Autenticado, limite de 30/min por usuário. Resposta `{ address, shortAddress, city, state }` no formato do app ("Av. Paulista, 1578 - Bela Vista, São Paulo - SP" / "Av. Paulista, 1578", estado em sigla); 404 `ADDRESS_NOT_FOUND`; 503 `GEOCODING_UNAVAILABLE` (provedor fora do ar ou lento; o app mantém a coordenada). Provedor: Photon (`ReverseGeocoder` → `PhotonGeocodingService`, URL em `services.photon.url` / `PHOTON_GEOCODING_URL`, `User-Agent` em `PHOTON_USER_AGENT`). A coordenada é **arredondada a 4 casas (~11 m)** antes de ir ao provedor; acertos ficam 24 h em cache e "sem endereço" 1 h (falhas do provedor não entram no cache).
- `GET /api/v1/rides/{id}`: Participantes, motorista que recebeu oferta ou admin. Também faz a corrida avançar no despacho. A corrida traz `searchExpiresAt` (ISO 8601), o **prazo da busca** calculado pela API (`createdAt` + `RideDispatcher::SEARCH_TIMEOUT_SECONDS`), preenchido em `REQUESTED`, `SEARCHING`, `OFFERED` e `NO_DRIVER_AVAILABLE` e `null` nos demais status; o app do passageiro usa esse campo no contador, sem conhecer a duração da busca.
- `POST /api/v1/rides/{id}/accept`: Motorista que recebeu a oferta (403 `NO_OFFER`; 409 `OFFER_EXPIRED`, `RIDE_UNAVAILABLE` ou `DRIVER_BUSY`). Lock atômico.
- `POST /api/v1/rides/{id}/reject`: Motorista recusa a oferta; a corrida segue para o próximo.
- `POST /api/v1/rides/{id}/arrived`: Motorista atribuído avisa que chegou ao embarque (`DRIVER_EN_ROUTE → DRIVER_ARRIVED`) e o passageiro recebe um push. Body opcional `{ latitude, longitude }` (a posição atual, que também atualiza a do motorista); sem ele, vale a última posição recebida se tiver até **2 min**, senão 422 `LOCATION_REQUIRED`. A mais de **300 m** do embarque → 422 `TOO_FAR_FROM_PICKUP` com `distanceMeters`, `maxDistanceMeters` e a mensagem "Você está a X m do embarque...". Repetir com a corrida já em `DRIVER_ARRIVED` responde 200 sem novo push (sem checar a distância); outros status → 409 `INVALID_STATE`; outro usuário → 403. Normalmente a chegada já foi marcada sozinha pelo `/driver/location`.
- `POST /api/v1/rides/{id}/validate-pin`: Motorista atribuído valida o PIN informado pelo passageiro e inicia a viagem (422 `INVALID_PIN`; 409 fora de `DRIVER_EN_ROUTE`/`DRIVER_ARRIVED`). Aceita a corrida ainda em `DRIVER_EN_ROUTE`, para o motorista que não avisou a chegada (registra `DRIVER_ARRIVED` no histórico, sem push).
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

