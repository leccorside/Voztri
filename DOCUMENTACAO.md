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

# 4. Execute as migrations com tabelas espaciais e dados de exemplo (Seeds)
docker compose exec app php artisan migrate --seed

# 5. Gere as chaves de criptografia e cache
docker compose exec app php artisan key:generate
docker compose exec app php artisan config:cache
```

### URLs de Acesso aos Serviços Locais:
- **API REST**: `http://localhost:8080/api/v1`
- **Painel Administrativo Web**: `http://localhost:3000`
- **Servidor WebSocket Reverb**: `ws://localhost:8081`
- **Mailpit (Caixa postal local para OTPs/Emails)**: `http://localhost:8025`
- **MinIO Console (Storage S3 local de fotos/documentos)**: `http://localhost:9001` (Usuário: `voztri_admin`, Senha: `voztri_password_safe`)

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
- `GET /api/v1/auth/me`: Retorna perfil do usuário logado e suas permissões.

### Motorista
- `POST /api/v1/driver/register`: Cadastro de dados complementares e veículo.
- `POST /api/v1/driver/documents`: Envio de CNH e CRLV para análise.
- `POST /api/v1/driver/status`: Altera disponibilidade (`ONLINE`, `OFFLINE`).
- `POST /api/v1/driver/location`: Transmite coordenadas de GPS (`latitude`, `longitude`, `heading`, `speed`).
- `GET /api/v1/driver/earnings`: Extrato de ganhos diários, semanais e repasses Pix.

### Passageiro & Corridas
- `POST /api/v1/rides/estimate`: Calcula rota via OSRM e retorna estimativa de preço por categoria.
- `POST /api/v1/rides/request`: Inicia uma solicitação de corrida com chave de idempotência.
- `POST /api/v1/rides/{id}/accept`: Motorista aceita a corrida oferecida (com lock atômico).
- `POST /api/v1/rides/{id}/start`: Motorista valida PIN do passageiro e inicia a viagem.
- `POST /api/v1/rides/{id}/complete`: Finaliza a corrida e dispara o fechamento financeiro.
- `POST /api/v1/rides/{id}/cancel`: Cancela corrida com regras de taxa e motivo.

### Chat & Emergência (SOS)
- `POST /api/v1/rides/{id}/chat`: Envia mensagem persistida via WebSocket.
- `POST /api/v1/rides/{id}/sos`: Aciona alerta de emergência 24h com gravação de ocorrência.
- `POST /api/v1/rides/{id}/sos/cancel`: Cancela o SOS mediante senha de segurança do passageiro.

---

## 6. Conformidade Legal e LGPD

1. **Minimização de Dados**: Coordenadas de GPS dos motoristas são apagadas da memória operacional após a desconexão ou término da corrida, mantendo apenas a polilinha histórica resumida para auditoria fiscal e segurança.
2. **Lei nº 13.640/2018**: O backend valida seguro APP (Acidentes Pessoais a Passageiros), CNH na categoria EAR (Exerce Atividade Remunerada) e antecedentes criminais antes da ativação do motorista.
3. **Ledger Imutável**: Nenhuma transação financeira pode ser editada ou deletada. Erros são corrigidos exclusivamente através de lançamentos compensatórios de estorno.

