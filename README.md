# VOZTRI — Plataforma Completa de Mobilidade Urbana

<p align="center">
  <img src="packages/design-tokens/assets/logo-fundo-claro.png" alt="VOZTRI Logo" width="320" />
</p>

<p align="center">
  <strong>Solução de mobilidade urbana completa, escalável e 100% independente de APIs pagas de mapas.</strong><br>
  Desenvolvida com arquitetura de alta concorrência para o mercado brasileiro, em conformidade com a <em>Lei nº 13.640/2018</em> e a <em>LGPD</em>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PHP-8.3-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP 8.3" />
  <img src="https://img.shields.io/badge/Laravel-11-FF2D20?style=for-the-badge&logo=laravel&logoColor=white" alt="Laravel 11" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PostGIS-3.4-336791?style=for-the-badge&logo=postgis&logoColor=white" alt="PostGIS" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/React_Native-0.74-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 📌 Sumário

1. [Visão Geral & Missão](#-visão-geral--missão)
2. [Identidade Visual & Experiência](#-identidade-visual--experiência)
3. [Stack Tecnológica](#-stack-tecnológica)
4. [Estrutura do Monorepo](#-estrutura-do-monorepo)
5. [Início Rápido com Docker](#-início-rápido-com-docker)
6. [Módulos e Funcionalidades](#-módulos-e-funcionalidades)
   - [Aplicativo do Passageiro](#aplicativo-do-passageiro)
   - [Aplicativo do Motorista](#aplicativo-do-motorista)
   - [Painel Administrativo Master](#painel-administrativo-master)
   - [Motor de Despacho & Concorrência](#motor-de-despacho--concorrência)
   - [Sistema Financeiro & Ledger Imutável](#sistema-financeiro--ledger-imutável)
   - [Infraestrutura de Mapas Open Source](#infraestrutura-de-mapas-open-source)
7. [Testes & Observabilidade](#-testes--observabilidade)
8. [Compilação Android & iOS](#-compilação-android--ios)
9. [Conformidade Legal & LGPD](#-conformidade-legal--lgpd)

---

## 🚀 Visão Geral & Missão

A **VOZTRI** é uma plataforma real de transporte individual e mobilidade urbana, concebida para oferecer uma experiência de nível industrial equivalente aos principais líderes de mercado (Uber e 99). 

O sistema integra:
- **Zero Dependência de APIs Pagas de Mapas**: Toda a infraestrutura cartográfica, geocodificação e cálculo viário baseia-se em **OpenStreetMap (OSM)**, **OSRM** e **Photon/Pelias**.
- **Alta Resiliência e Concorrência**: Despacho inteligente com travas atômicas distribuídas em **Redis** e consultas espaciais ultrarrápidas no **PostGIS**.
- **Integridade Contábil Estrita**: Todas as operações financeiras são regidas por um **Ledger de partidas dobradas** com precisão decimal exata em centavos inteiros.
- **Multiplataforma Pronta**: Código TypeScript compartilhado entre passageiro, motorista e painel web, com preparação arquitetural completa para **Android** e **iOS**.

---

## 🎨 Identidade Visual & Experiência

A plataforma utiliza o design system proprietário **Urban Mobility Kinetic System**:

| Elemento | Especificação | Aplicação |
| :--- | :--- | :--- |
| **Cor Principal** | `#6A00FF` | Botões de ação primária, botões de solicitação, destaques |
| **Primária Escura** | `#4F00C3` | Topbars, modais de estado elevado, texto de destaque |
| **Roxo Claro** | `#9B4DFF` | Gradientes da marca, ícones ativos |
| **Lavanda** | `#C9B2FF` | Chips de categorias, estados de hover |
| **Superfície Escura** | `#0B1026` | Dark Mode, HUD de navegação noturna e painel admin |
| **Superfície Clara** | `#F4F6FA` / `#FBF8FF` | Fundo das aplicações e cards limpos |
| **Tipografia** | **Montserrat** | Pesos 800 (Display), 700 (Headline), 600 (Title), 400 (Body) |

---

## 🛠 Stack Tecnológica

### Backend & Serviços
- **Linguagem / Framework**: PHP 8.3 & Laravel 11 (Domain-Driven Design Modular)
- **Autenticação**: Laravel Sanctum (Tokens Bearer com expiração e revogação)
- **WebSockets / Tempo Real**: Laravel Reverb & Redis Pub/Sub
- **Banco de Dados**: PostgreSQL 16 com extensão espacial PostGIS 3.4
- **Cache & Chaves Rápidas**: Redis 7 In-Memory (`GEOADD`, `GEORADIUS`)
- **Roteamento & Geocodificação**: OSRM Local (`driving/car.lua`) & Photon
- **Storage de Mídia**: MinIO (compatível com AWS S3)
- **Servidor Web**: Nginx Alpine com proxy reverso e proteção contra DDoS/Injection

### Aplicativos Móveis (Passageiro e Motorista)
- **Framework**: React Native com TypeScript
- **Gerenciamento de Estado**: Zustand (alta performance sem re-renderizações desnecessárias)
- **Mapas**: MapLibre GL Native (Renderização em hardware 60fps)
- **Validação de Schemas**: Zod para tipagem ponta a ponta
- **Feedback Tátil**: Haptic feedback integrado para confirmação de ações

### Painel Administrativo Web
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Mapas ao Vivo**: MapLibre GL JS integrado com monitoramento operacional

---

## 📂 Estrutura do Monorepo

```text
voztri/
├── apps/
│   ├── passenger-mobile/       # App Passageiro (React Native)
│   ├── driver-mobile/          # App Motorista (React Native)
│   └── admin-web/              # Painel Administrativo Master (React + Vite)
├── backend/
│   ├── app/
│   │   ├── Domain/             # Entidades, Enums, Máquinas de Estado e Regras de Negócio
│   │   ├── Application/        # Casos de Uso (UseCases) e DTOs
│   │   ├── Infrastructure/     # Repositórios PostGIS, Redis Geo, OSRM e Gateways
│   │   ├── Http/               # Controllers REST v1, FormRequests e Middlewares
│   │   └── Events/             # Eventos WebSocket (Reverb)
│   ├── database/               # Migrations PostGIS e Seeders com dados de SP
│   ├── routes/                 # api.php, web.php, channels.php (WebSockets)
│   └── tests/                  # Testes Unitários e de Concorrência
├── packages/
│   ├── design-tokens/          # Cores (#6A00FF), Tipografia Montserrat e Assets
│   ├── shared-types/           # Tipagens e DTOs TypeScript compartilhados
│   ├── validation/             # Esquemas de validação Zod
│   ├── localization/           # Suporte a pt-BR, en-US e es-ES
│   └── api-client/             # Cliente HTTP Axios com interceptors e renovação de token
├── infrastructure/
│   ├── docker/                 # Dockerfile PHP 8.3-FPM
│   ├── nginx/                  # Configuração de proxy e cabeçalhos de segurança
│   ├── maps/                   # Instruções e grafo OSRM local
│   ├── monitoring/             # Prometheus e script k6 de carga
│   └── scripts/                # Scripts de build Android (.bat e .sh)
├── docs/                       # Especificações arquiteturais e manuais de release
├── docker-compose.yml          # Orquestrador completo dos serviços de backend
├── CONTEXTO.md                 # Visão geral e estado vivo do projeto
├── DOCUMENTACAO.md             # Guia técnico aprofundado e documentação de rotas
└── PASSOS.md                   # Registro histórico de todas as 12 fases executadas
```

---

## ⚡ Início Rápido com Docker

Toda a infraestrutura de backend, banco de dados e mensageria é executada via Docker:

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/voztri.git
cd voztri

# 2. Crie o arquivo de configuração de ambiente
cp .env.example .env

# 3. Suba todos os containers orquestrados
docker compose up -d --build

# 4. Execute as migrações do banco com as tabelas espaciais PostGIS e dados iniciais
docker compose exec app php artisan migrate --seed

# 5. Gere as chaves de criptografia e cache
docker compose exec app php artisan key:generate
docker compose exec app php artisan config:cache
```

### Portas e Serviços Locais

| Serviço | URL Local | Descrição |
| :--- | :--- | :--- |
| **API REST v1** | `http://localhost:8080/api/v1` | Endpoints centrais de corridas e autenticação |
| **Painel Admin Web** | `http://localhost:3000` | Dashboard operacional master |
| **Servidor WebSocket** | `ws://localhost:8081` | Laravel Reverb para eventos em tempo real |
| **PostgreSQL + PostGIS**| `localhost:5432` | Banco de dados geoespacial (`voztri_db`) |
| **Redis In-Memory** | `localhost:6379` | Cache de alta velocidade e `driver_geo` |
| **Mailpit (Dev SMTP)** | `http://localhost:8025` | Interface web para leitura de códigos OTP/SMS |
| **MinIO Console** | `http://localhost:9001` | Armazenamento de fotos de CNH/CRLV |

---

## 📱 Módulos e Funcionalidades

### Aplicativo do Passageiro
- **Mapa Interativo**: Localização em tempo real com indicador cinético e veículos próximos simulados com ETA.
- **Categorias Diversificadas**:
  - `VozTri Pop`: Viagens diárias com máxima economia.
  - `VozTri Black`: Frotas executivas de alto padrão.
  - `VozTri Mulher`: Opção exclusiva de motoristas mulheres para passageiras.
  - `VozTri Moto`: Deslocamentos rápidos com custo até 40% menor.
- **Código de Embarque (PIN)**: PIN de 4 dígitos em alta visibilidade gerado dinamicamente para validação obrigatória no início da viagem.
- **Central de Emergência SOS 24h**: Acionamento em um clique que alerta a equipe de monitoramento e envia a rota aos contatos de confiança, desativável apenas com PIN de segurança.
- **Avaliações & Gorjetas**: Avaliação de 1 a 5 estrelas com opções de gorjeta (+R$ 2, +R$ 5, +R$ 10) e tags de elogio.

### Aplicativo do Motorista
- **Painel Operacional**: Botão deslizante / toggle Online/Offline com atualização imediata no Redis GEO.
- **HUD de Ganhos Diários**: Exibição consolidada dos ganhos do dia, viagens concluídas e avaliação com detalhamento de metas.
- **Modal de Oferta de Corrida**: Contagem regressiva de 15 segundos exibindo valor líquido, distância de embarque e endereço de destino.
- **Navegação Curva a Curva**: Informações de manobra em tempo real, velocímetro dinâmico e validação de PIN de embarque.
- **Repasse Instantâneo Pix**: Extrato diário e semanal com botão para transferência imediata de saldo sem tarifas.

### Painel Administrativo Master
- **Live Operations Map**: Monitoramento geográfico ao vivo de todos os motoristas em trânsito e disponíveis.
- **Homologação Documental**: Aprovação ou bloqueio de motoristas com validação de CNH com observação EAR e CRLV.
- **Gestão de Tarifas**: Configuração de tarifa base, preço por km e minuto por cidade.
- **Auditoria & Compliance**: Trilha imutável de todas as intervenções de operadores com registro de IP e timestamp.

### Motor de Despacho & Concorrência
- **Despacho Concêntrico**: Busca de motoristas qualificados em anéis progressivos de 2 km, 5 km, 8 km e 12 km.
- **Proteção Atômica contra Duplo Aceite**: Locks distribuídos no Redis garantem que uma corrida oferecida não possa ser aceita simultaneamente por dois motoristas concorrentes.
- **Máquina de Estados Rigorosa**: Transições auditadas: `REQUESTED` ➔ `SEARCHING` ➔ `OFFERED` ➔ `ACCEPTED` ➔ `DRIVER_EN_ROUTE` ➔ `DRIVER_ARRIVED` ➔ `IN_PROGRESS` ➔ `COMPLETED` / `CANCELLED`.

### Sistema Financeiro & Ledger Imutável
- **Sem Erros de Ponto Flutuante**: Todos os cálculos são executados com precisão inteira em centavos (`amount_cents`).
- **Partidas Dobradas**: Todo fechamento de corrida gera crédito líquido para a conta do motorista e crédito de 15% para a plataforma com balanço contábil verificado.

---

## 🧪 Testes & Observabilidade

### Execução dos Testes Automatizados
```bash
# Testes unitários de regras de negócio, cálculo de tarifas e Ledger
docker compose exec app php artisan test --filter=LedgerServiceTest
docker compose exec app php artisan test --filter=RideStateMachineTest

# Testes de concorrência e segurança de aceite de corridas
docker compose exec app php artisan test --filter=ConcurrencyAndSecurityTest
```

### Teste de Carga com k6
Para simular 100 usuários solicitando corridas simultaneamente:
```bash
k6 run infrastructure/monitoring/k6-load-test.js
```

---

## 📦 Compilação Android & iOS

### Android (Release APK & AAB)
O projeto está configurado com otimização Hermes e ProGuard habilitado:
```bash
# Windows
infrastructure\scripts\build-android.bat

# Linux / macOS
chmod +x infrastructure/scripts/build-android.sh
./infrastructure/scripts/build-android.sh
```

### iOS (Xcode & CocoaPods)
Consulte as instruções completas no documento [docs/guia-build-ios.md](file:///d:/PROJETOS/VOZTRI/docs/guia-build-ios.md).

---

## ⚖️ Conformidade Legal & LGPD

1. **Lei nº 13.640/2018**: Os cadastros exigem comprovação de CNH na categoria B ou superior com observação **EAR** (Exerce Atividade Remunerada) e seguro APP para passageiros.
2. **Minimização de Dados e Privacidade**: Os registros de telemetria GPS são vinculados à corrida ativa e limpos da memória operacional após a desconexão do motorista.
3. **Imutabilidade Contábil**: Nenhuma transação pode ser excluída do sistema financeiro, permitindo apenas lançamentos compensatórios devidamente auditados.

---

## 📄 Licença

Este software é um produto proprietário da **VOZTRI Tecnologia em Mobilidade Urbana**. Todos os direitos reservados.

