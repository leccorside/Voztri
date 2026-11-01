# VOZTRI — Contexto do Projeto e Arquitetura Viva

## 1. Visão Geral e Missão
O **VOZTRI** é uma plataforma completa e real de mobilidade urbana com funcionalidades equivalentes às principais soluções do mercado brasileiro (Uber e 99). O sistema permite que passageiros solicitem corridas e motoristas aceitem solicitações, com rastreamento GPS em tempo real, cálculo dinâmico de tarifas, split/repasses de pagamentos (Pix, Cartão, Dinheiro), avaliações, chat com WebSockets, central de emergência SOS 24h e painel administrativo master para gestão operacional e financeira.

## 2. Princípios Arquiteturais e Diretrizes
1. **Tecnologias Open Source e Gratuitas**: Foco em custo zero de licenciamento base, utilizando OpenStreetMap, MapLibre, OSRM/Valhalla, Photon, PostgreSQL + PostGIS, Redis e Docker.
2. **Independência de Provedores**: Abstração completa de serviços de mapas, pagamentos, SMS/OTP e push notifications através de interfaces e adapters desacoplados.
3. **Monolito Modular no Backend**: Arquitetura Domain-Driven Design (DDD) modular em Laravel 11/PHP 8.3, separando Domínio, Aplicação, Infraestrutura e HTTP, viabilizando escalabilidade sem a complexidade prematura de microsserviços.
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
- **Backend**: Estrutura Laravel 11 com Domain Driven Design, Dockerfile, Nginx, PostgreSQL + PostGIS, Redis, Horizon, Reverb WebSockets.
- **Packages**: `design-tokens`, `shared-types`, `validation`, `localization`, `api-client` criados com tipagens e esquemas completos.
- **Apps**: Estruturados com suporte a TypeScript, React Navigation, Zustand e MapLibre.
- **Documentação**: Especificações de Arquitetura, Banco de Dados, Mapas, GPS, Pagamentos, Multiplataforma e Testes geradas.

## 6. Próximos Passos
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

