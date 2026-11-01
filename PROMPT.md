# VOZTRI — DESENVOLVIMENTO COMPLETO DA PLATAFORMA DE MOBILIDADE URBANA

## 1. MISSÃO DO PROJETO

Desenvolva uma plataforma completa de mobilidade urbana chamada **VOZTRI**, com funcionalidades equivalentes às principais experiências encontradas nos aplicativos Uber e 99.

A plataforma deverá permitir que passageiros solicitem corridas e que motoristas aceitem solicitações, realizando viagens com acompanhamento GPS em tempo real, cálculo de tarifas, pagamentos, avaliações, comunicação, segurança e administração operacional.

**Este projeto não é um protótipo.**

Desenvolva um sistema real, com backend, aplicativos móveis, banco de dados, comunicação em tempo real, regras de negócio, autenticação, pagamentos, mapas, testes e infraestrutura.

### Plataformas

Prioridade inicial:
- Android para passageiros.
- Android para motoristas.
- Painel administrativo web.

Preparação obrigatória:
- Aplicativo iOS de passageiros.
- Aplicativo iOS de motoristas.

Não desenvolver os aplicativos iOS neste primeiro momento, mas preparar o código compartilhado para compilação futura, evitando lógica de negócio específica do Android.

### Objetivos

1. Utilizar o máximo de tecnologias gratuitas e open source.
2. Minimizar dependência de APIs pagas.
3. Permitir implantação em infraestrutura própria.
4. Executar toda a infraestrutura de desenvolvimento em Docker.
5. Construir arquitetura escalável e modular.
6. Garantir segurança e rastreabilidade das operações.
7. Manter a identidade visual original da VOZTRI.
8. Implementar funcionalidades completas de aplicativos de transporte.
9. Preparar expansão para múltiplas cidades.
10. Evitar recursos meramente decorativos ou dados simulados em produção.

---

# 2. IDENTIDADE VISUAL

Utilizar obrigatoriamente a identidade visual VOZTRI fornecida como referência.

### Cores

- Principal: #6A00FF
- Roxo claro: #9B4DFF
- Lavanda: #C9B2FF
- Azul escuro: #0B1026
- Cinza: #F4F6FA
- Branco: #FFFFFF

### Tipografia

Montserrat.

### Logo

Utilizar exclusivamente a logo original fornecida, composta pelo "V" em gradiente roxo com um marcador de localização integrado.

Não redesenhar ou substituir o ícone.

### Interface

- Design premium.
- Mobile-first.
- Temas claro e escuro.
- Componentes reutilizáveis.
- Bottom sheets.
- Mapas interativos.
- Animações suaves.
- Estados de carregamento.
- Feedback háptico.
- Navegação gestual.
- Layout adaptável.
- Suporte a acessibilidade.
- Compatibilidade com diferentes tamanhos de tela.

Usar os protótipos existentes como referência para implementação, preservando seus fluxos e componentes quando forem adequados.

---

# 3. STACK TECNOLÓGICA OBRIGATÓRIA

## Aplicativos móveis

- React Native.
- TypeScript.
- React Navigation.
- Zustand para estado global.
- TanStack Query para dados do servidor.
- React Hook Form.
- Zod.
- React Native Reanimated.
- React Native Gesture Handler.
- Secure Storage para credenciais.
- SQLite para armazenamento local.
- MapLibre React Native.
- Bibliotecas nativas de localização.
- Firebase Cloud Messaging para push Android.
- Preparação de camada de notificações iOS com APNs.

Utilizar React Native CLI ou Expo com development builds e módulos nativos, conforme a compatibilidade real dos requisitos.

Não utilizar uma solução dependente exclusivamente do Expo Go.

## Backend

- PHP 8.
- Laravel.
- Laravel Sanctum.
- Laravel Reverb.
- Laravel Queues.
- Laravel Horizon.
- PostgreSQL.
- PostGIS.
- Redis.
- Nginx.
- Docker.

## Administração

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- TanStack Query.
- Zustand.
- Recharts.
- React Hook Form.
- Zod.

## Infraestrutura

- Docker Compose.
- MinIO.
- Mailpit para desenvolvimento.
- Prometheus.
- Grafana.
- Loki.
- GitHub Actions.
- Testcontainers quando apropriado.

Manter todas as versões definidas e compatíveis.

---

# 4. ESTRUTURA DO PROJETO

Criar um monorepo organizado:

```text
voztri/
├── apps/
│   ├── passenger-mobile/
│   ├── driver-mobile/
│   └── admin-web/
├── backend/
│   ├── app/
│   │   ├── Domain/
│   │   ├── Application/
│   │   ├── Infrastructure/
│   │   ├── Http/
│   │   └── Providers/
│   ├── database/
│   ├── routes/
│   └── tests/
├── packages/
│   ├── design-tokens/
│   ├── shared-types/
│   ├── api-client/
│   ├── validation/
│   └── localization/
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   ├── maps/
│   ├── monitoring/
│   └── scripts/
├── docs/
├── docker-compose.yml
├── .env.example
├── CONTEXTO.md
├── DOCUMENTACAO.md
└── PASSOS.md
```

Criar autenticação, transporte, pagamentos, localização, notificações, relatórios e auditoria em módulos independentes.

Priorizar monólito modular em vez de iniciar com dezenas de microsserviços.

---

# 5. SISTEMA DE MAPAS GRATUITO

Implementar uma infraestrutura de mapas baseada em ferramentas open source.

### Tecnologias

- OpenStreetMap como fonte cartográfica.
- MapLibre para exibição.
- OSRM ou Valhalla para rotas.
- Photon ou Pelias para geocodificação.
- PostGIS para consultas geográficas.
- Serviço próprio de tiles vetoriais ou fornecedor com licença apropriada.

### Funcionalidades

Implementar:

1. Exibição de mapas.
2. Localização atual.
3. Busca de endereços.
4. Sugestões de endereços.
5. Seleção no mapa.
6. Marcadores personalizados.
7. Pontos de origem e destino.
8. Traçado de rotas.
9. Rotas alternativas.
10. Estimativa de distância.
11. Estimativa de chegada.
12. Localização de motoristas.
13. Mapa de demanda.
14. Recalcular rotas.
15. Identificação de desvios.
16. Múltiplas paradas.
17. Regiões operacionais.
18. Geofencing.
19. Mapa claro e escuro.
20. Navegação com instruções curva a curva.

### Regras

Não utilizar servidores públicos gratuitos de tiles, geocodificação ou roteamento como backend de produção de alto tráfego.

Implementar desenvolvimento com serviços locais e dados geográficos de uma cidade inicialmente configurável.

Criar abstrações para substituir qualquer provedor de mapas sem reescrever os aplicativos.

Registrar atribuições e respeitar licenças dos dados cartográficos.

Para navegação, implementar instruções, atualização de posição, manobras, recálculo e chegada. Não tratar apenas uma linha desenhada no mapa como navegação completa.

---

# 6. LOCALIZAÇÃO GPS EM TEMPO REAL

O sistema precisa acompanhar os motoristas durante sua disponibilidade e as viagens ativas.

### Implementar

- Captura de latitude e longitude.
- Precisão da localização.
- Velocidade e direção.
- Timestamp.
- Atualização dinâmica da frequência.
- Transmissão via WebSockets.
- Reconexão automática.
- Detecção de GPS desativado.
- Detecção de perda de internet.
- Buffer temporário de posições.
- Identificação de localização desatualizada.
- Rastreamento de viagens.
- Tratamento de localização simulada suspeita.
- Economia de bateria.

### Frequência

Configuração inicial sugerida:

- Motorista offline: sem rastreamento operacional contínuo.
- Motorista online parado: 15 a 30 segundos.
- Motorista online em movimento: 5 a 10 segundos.
- Corrida ativa: 2 a 5 segundos, adaptativamente.

Os intervalos devem considerar distância percorrida, precisão, bateria, conectividade e restrições do sistema operacional.

### Android em segundo plano

Implementar Foreground Service para rastreamento de viagens e disponibilidade quando necessário e permitido.

Exibir notificação persistente apropriada.

Solicitar permissões de localização de forma contextual e transparente, atendendo às políticas do Android e Google Play.

No futuro, implementar equivalente nativo para iOS.

Nunca presumir que o sistema operacional permitirá rastreamento ilimitado em segundo plano.

---

# 7. CADASTRO E AUTENTICAÇÃO

## Passageiro

Criar:

- Cadastro por e-mail.
- Cadastro por telefone.
- Login por senha.
- Verificação de e-mail.
- Verificação de telefone por OTP, quando habilitada.
- Login Google.
- Login Apple preparado para iOS.
- Recuperação de senha.
- Sessões autenticadas.
- Renovação de tokens.
- Logout de dispositivos.
- Exclusão de conta.
- Histórico de sessões.
- Proteção contra força bruta.

Priorizar autenticação por e-mail para manter o desenvolvimento gratuito.

Implementar OTP por SMS mediante provedor configurável, não presumindo SMS ilimitado gratuito.

## Motorista

Exigir:

- Nome completo.
- CPF.
- Data de nascimento.
- Telefone.
- E-mail.
- Foto.
- CNH com EAR, conforme exigências aplicáveis.
- Documentos e dados do veículo.
- Informações bancárias.
- Aceite dos termos.
- Aprovação administrativa.

O motorista não poderá receber corridas até a aprovação do cadastro.

Implementar verificação documental, validade, bloqueio de documentos vencidos e reanálise.

Não considerar reconhecimento automático de documentos como verificação suficiente sem validação apropriada.

---

# 8. APLICATIVO DO PASSAGEIRO

Implementar todas as funcionalidades abaixo com backend real.

## Home

- Localização atual.
- Mapa interativo.
- Motoristas disponíveis.
- Campo "Para onde vamos?".
- Casa e Trabalho.
- Destinos favoritos.
- Histórico de locais.
- Promoções.
- Agendamentos.
- Menu inferior.

## Solicitar corrida

Permitir:

1. Escolher origem.
2. Escolher destino.
3. Selecionar pontos intermediários.
4. Calcular percurso.
5. Exibir categorias disponíveis.
6. Calcular estimativa de preço.
7. Exibir tempo de espera.
8. Escolher pagamento.
9. Aplicar cupom.
10. Confirmar corrida.
11. Encontrar motorista.
12. Acompanhar sua aproximação.
13. Confirmar embarque com PIN.
14. Acompanhar viagem.
15. Finalizar e pagar.
16. Avaliar motorista.

## Categorias

Implementar:

- VOZTRI Go.
- VOZTRI Comfort.
- VOZTRI Black.
- VOZTRI Moto.
- VOZTRI XL.
- VOZTRI Entregas.

Todas as categorias devem ser configuráveis no painel administrativo, inclusive capacidade, elegibilidade, valor e disponibilidade regional.

Não permitir categorias sem respaldo regulatório ou operacional na cidade de atuação.

## Corridas agendadas

- Agendar data e horário.
- Confirmar preço aplicável.
- Gerenciar agendamentos.
- Reagendar.
- Cancelar.
- Receber notificações.
- Iniciar busca conforme antecedência configurada.
- Tratar indisponibilidade de motoristas.

## Comunicação

- Chat passageiro/motorista.
- Mensagens rápidas.
- Notificações de novas mensagens.
- Máscara de informações pessoais.
- Chamadas telefônicas com proteção de números quando houver integração apropriada.
- Comunicação com suporte.

## Segurança

- Código PIN de embarque.
- Compartilhamento de corrida.
- Contatos de confiança.
- Botão de emergência.
- Informações do motorista.
- Dados do veículo.
- Registro de incidentes.
- Denúncias.
- Objetos perdidos.
- Central de ajuda.

Não prometer acionamento automático de serviços públicos de emergência sem integração real e homologada.

## Financeiro

- Pix.
- Cartão de crédito.
- Cartão de débito.
- Dinheiro.
- Carteira.
- Cupons.
- Créditos promocionais.
- Recibos.
- Reembolsos.
- Gorjetas.
- Histórico de transações.
- Contestação de cobranças.

## Perfil

- Informações pessoais.
- Foto.
- Endereços favoritos.
- Pagamentos.
- Histórico de viagens.
- Notificações.
- Segurança.
- Privacidade.
- Idiomas.
- Tema.
- Exclusão da conta.

---

# 9. APLICATIVO DO MOTORISTA

Criar aplicativo separado, com código compartilhado quando apropriado.

## Dashboard

Exibir:

- Mapa.
- Botão Online/Offline.
- Status de disponibilidade.
- Ganhos do dia.
- Ganhos da semana.
- Corridas realizadas.
- Avaliação.
- Tempo conectado.
- Regiões de demanda.
- Campanhas de incentivo.

## Receber corridas

A solicitação deve exibir:

- Origem.
- Distância até o embarque.
- Destino conforme regras da plataforma.
- Distância da viagem.
- Tempo estimado.
- Valor previsto.
- Categoria.
- Indicadores relevantes.
- Temporizador.
- Aceitar.
- Recusar.

## Gerenciar corrida

Implementar:

1. Aceitar solicitação.
2. Navegar até o passageiro.
3. Informar chegada.
4. Confirmar PIN.
5. Iniciar viagem.
6. Seguir rota.
7. Atualizar posição.
8. Finalizar corrida.
9. Confirmar pagamento.
10. Avaliar passageiro.

## Recursos adicionais

- Cancelamento justificado.
- Pausar recebimento.
- Destino preferencial.
- Filtros permitidos de viagens.
- Histórico.
- Ganhos.
- Saques.
- Extratos.
- Avaliações.
- Documentação.
- Veículos.
- Promoções.
- Notificações.
- Suporte.
- Segurança.

## Ganhos

Exibir:

- Valor bruto.
- Comissão VOZTRI.
- Valor líquido.
- Gorjetas.
- Incentivos.
- Saldo.
- Transferências.
- Histórico de repasses.

Nenhum cálculo financeiro deve depender exclusivamente do aplicativo móvel.

---

# 10. MOTOR DE DISTRIBUIÇÃO DE CORRIDAS

Implementar um serviço centralizado de despacho de corridas.

Este é um dos componentes mais importantes.

## Regras

Ao receber uma solicitação:

1. Validar passageiro.
2. Validar região atendida.
3. Validar endereço.
4. Calcular rota.
5. Calcular tarifa.
6. Validar categoria.
7. Buscar motoristas disponíveis.
8. Filtrar veículos elegíveis.
9. Verificar posição recente.
10. Calcular tempo estimado de chegada.
11. Classificar candidatos.
12. Enviar oferta.
13. Aguardar aceite.
14. Repetir busca quando necessário.
15. Confirmar associação de forma atômica.

## Localização de motoristas

Utilizar PostGIS para consulta geográfica e Redis para estado operacional de baixa latência.

Iniciar busca por raio configurável:

- 2 km.
- 5 km.
- 8 km.
- 12 km.

Não usar somente distância em linha reta para definir o melhor motorista.

O algoritmo deve considerar:

- ETA real.
- Distância viária.
- Categoria.
- Disponibilidade.
- Recência do GPS.
- Restrições operacionais.
- Carga de ofertas.
- Critérios transparentes e auditáveis.

## Distribuição

Implementar estratégia configurável:

- Oferta sequencial.
- Pequenos grupos de candidatos.
- Expansão progressiva de raio.
- Timeout.
- Reoferta.
- Tratamento de recusas.

Evitar disparar a mesma corrida de maneira descontrolada para dezenas de motoristas.

## Concorrência

Garantir que:

- Uma corrida não possa ser atribuída simultaneamente a dois motoristas.
- Um motorista não aceite duas corridas incompatíveis.
- Apenas um aceite válido seja confirmado.
- Solicitações expiradas sejam invalidadas.
- Requisições duplicadas não criem novas viagens.

Utilizar transações, locks, chaves de idempotência e controle de versão.

---

# 11. MÁQUINA DE ESTADOS DA CORRIDA

Criar estados:

```text
REQUESTED
SEARCHING
OFFERED
ACCEPTED
DRIVER_EN_ROUTE
DRIVER_ARRIVED
IN_PROGRESS
COMPLETED
CANCELLED
NO_DRIVER_AVAILABLE
EXPIRED
```

Criar também estados independentes para:

- Pagamento.
- Reembolso.
- Contestação.
- Agendamento.
- Repasse.
- Incidente de segurança.

Não misturar status de viagem com status financeiro.

Cada transição deve possuir:

- Regras de autorização.
- Condições obrigatórias.
- Timestamp.
- Histórico de eventos.
- Identificação do responsável.
- Auditoria.

Eventos precisam ser processados de maneira idempotente.

---

# 12. SISTEMA DE TARIFAS

Criar motor de precificação configurável.

## Componentes

- Tarifa base.
- Preço por quilômetro.
- Preço por minuto.
- Valor mínimo.
- Categoria do veículo.
- Região.
- Horário.
- Demanda.
- Oferta de motoristas.
- Paradas adicionais.
- Taxas permitidas.
- Promoções.
- Descontos.
- Cancelamentos.

## Fórmula inicial

```text
valor =
  tarifa_base
  + (distancia_km * preco_km)
  + (duracao_min * preco_min)
  + adicionais
  + taxas_aplicaveis
  - descontos
```

O sistema deve permitir aplicar um multiplicador dinâmico limitado e auditável, respeitando as normas aplicáveis.

## Regras importantes

- Exibir estimativa antes da confirmação.
- Registrar versão da política tarifária.
- Explicar alterações de preço.
- Não modificar uma tarifa acordada arbitrariamente.
- Recalcular valores somente quando as regras contratuais permitirem.
- Registrar ajustes.
- Usar decimal monetário, nunca ponto flutuante para cálculos financeiros.
- Controlar arredondamentos.

---

# 13. PAGAMENTOS E CARTEIRA

Criar camada de integração independente de provedor.

## Abstração

```text
PaymentProvider
├── createPayment()
├── authorizePayment()
├── capturePayment()
├── refundPayment()
├── getPaymentStatus()
├── verifyWebhook()
└── createDriverPayout()
```

Implementar adaptadores conforme capacidades reais do provedor escolhido.

## Requisitos

- Pix.
- Cartão de crédito.
- Débito, quando suportado.
- Dinheiro.
- Reembolsos.
- Webhooks.
- Repasse para motoristas.
- Comissões.
- Conciliação.
- Histórico financeiro.
- Estornos.
- Disputas.

Avaliar inicialmente Asaas, Mercado Pago e outros provedores brasileiros que ofereçam Pix, cartão e mecanismos apropriados de repasse.

Não presumir split automático, saque gratuito ou ausência de taxas.

Não armazenar números completos de cartão, CVV ou dados financeiros sensíveis desnecessariamente.

## Carteira

Criar ledger financeiro com lançamentos imutáveis e transações compensatórias.

Separar:

- Saldo promocional.
- Recebíveis.
- Saldo disponível.
- Valores retidos.
- Reembolsos.
- Repasses.

Não permitir movimentação de valores reais entre usuários por carteira própria sem validação regulatória e estrutura financeira adequada.

---

# 14. NOTIFICAÇÕES EM TEMPO REAL

Implementar:

- Firebase Cloud Messaging no Android.
- Preparação para APNs no iOS.
- Notificações internas.
- Eventos via WebSockets.
- E-mail transacional.

### Passageiro

- Motorista encontrado.
- Motorista a caminho.
- Motorista chegou.
- Viagem iniciada.
- Viagem concluída.
- Pagamento confirmado.
- Corrida cancelada.
- Promoções, mediante preferências.

### Motorista

- Nova solicitação.
- Corrida cancelada.
- Passageiro aguardando.
- Pagamento registrado.
- Novo incentivo.
- Documento próximo do vencimento.
- Nova mensagem.

Usar persistência de notificações, tentativas de reenvio, controle de duplicidade e preferências dos usuários.

Notificações push não substituem o canal confiável de eventos do backend.

---

# 15. COMUNICAÇÃO E CHAT

Criar chat real entre motorista e passageiro.

- WebSockets.
- Mensagens persistidas.
- Histórico por corrida.
- Indicador de leitura.
- Mensagens rápidas.
- Proteção contra spam.
- Controle de acesso.
- Denúncia de mensagens.
- Anexos quando permitido.
- Encerramento da conversa após prazo configurável.

Não utilizar números telefônicos públicos como identificadores de conversação.

---

# 16. PAINEL ADMIN MASTER

Criar dashboard web completo.

## Dashboard

- Passageiros cadastrados.
- Motoristas cadastrados.
- Motoristas online.
- Corridas ativas.
- Corridas concluídas.
- Cancelamentos.
- Receita bruta.
- Receita da plataforma.
- Comissões.
- Pagamentos pendentes.
- Tempo médio de atendimento.
- Taxa de aceite.

## Operações ao vivo

- Mapa de motoristas.
- Corridas ativas.
- Regiões de atendimento.
- Ocorrências.
- Condições de operação.
- Alertas.
- Controle de disponibilidade por cidade.

## Motoristas

- Cadastro.
- Aprovação.
- Documentos.
- Veículos.
- Bloqueios.
- Avaliações.
- Histórico.
- Financeiro.
- Auditoria.

## Passageiros

- Contas.
- Status.
- Corridas.
- Pagamentos.
- Denúncias.
- Restrições.
- Suporte.

## Corridas

- Listagem.
- Detalhes.
- Linha do tempo.
- GPS e rota histórica conforme política de retenção.
- Cancelamentos.
- Ajustes tarifários.
- Incidentes.
- Disputas.

## Configurações

- Categorias de veículos.
- Tarifas por cidade.
- Comissões.
- Áreas operacionais.
- Cupons.
- Promoções.
- Programa de indicação.
- Assinaturas.
- Incentivos.
- Provedores de pagamento.
- Provedores de mapas.
- Integrações de notificações.
- Controle de permissões.
- Gestão de administradores.

## Auditoria

Registrar operações críticas:

- Alteração de tarifa.
- Bloqueio de usuário.
- Aprovação de motorista.
- Cancelamento administrativo.
- Ajuste financeiro.
- Reembolso.
- Alteração de comissão.
- Mudanças de permissões.

---

# 17. BANCO DE DADOS

Utilizar PostgreSQL + PostGIS.

Criar migrations para as entidades principais:

```text
users
user_profiles
user_devices
user_sessions
roles
permissions

passengers
drivers
driver_documents
driver_vehicles
vehicle_categories
vehicle_inspections

cities
service_areas
geofences
driver_locations
driver_availability

ride_requests
ride_offers
rides
ride_stops
ride_locations
ride_status_history
ride_cancellations
ride_schedules

fare_rules
fare_estimates
dynamic_pricing_rules

payment_methods
payments
payment_events
refunds
financial_ledger
driver_earnings
driver_payouts

coupons
promotions
referrals
subscriptions

reviews
conversations
messages
notifications

support_tickets
safety_incidents
trusted_contacts

admin_users
audit_logs
system_settings
integration_settings
```

### Requisitos

- UUID ou identificadores distribuídos apropriados.
- Índices geográficos GiST.
- Índices para consultas frequentes.
- Integridade referencial.
- Constraints.
- Soft delete onde adequado.
- Histórico de alterações.
- Timestamps UTC.
- Campos monetários decimais.
- Migrações versionadas.
- Políticas de retenção.
- Particionamento de grandes tabelas quando justificado.

---

# 18. API REST E WEBSOCKETS

Versionar a API em `/api/v1`.

Implementar endpoints para:

- Autenticação.
- Perfil.
- Cadastro de motoristas.
- Documentos.
- Veículos.
- Categorias.
- Endereços.
- Rotas.
- Estimativas.
- Solicitação de corrida.
- Ofertas.
- Aceite.
- Cancelamento.
- Início.
- Finalização.
- Histórico.
- Pagamentos.
- Repasse.
- Avaliações.
- Mensagens.
- Segurança.
- Administração.

Documentar com OpenAPI.

### WebSockets

Criar canais autenticados para:

- Localização do motorista.
- Solicitações de corridas.
- Ofertas.
- Atualização de viagem.
- Mensagens.
- Operações administrativas.
- Notificações críticas.

Garantir autorização por canal e revogação de acesso.

---

# 19. SEGURANÇA E LGPD

Implementar:

- HTTPS.
- Criptografia em trânsito.
- Proteção de dados em repouso.
- Tokens seguros.
- Rotação de credenciais.
- Rate limiting.
- RBAC.
- Validação de entrada.
- Proteção contra IDOR.
- Proteção contra SQL Injection.
- Proteção contra XSS.
- Logs de acesso.
- Auditoria.
- Controle de dispositivos.
- Antifraude.
- Detecção de localização suspeita.
- Proteção de endpoints de pagamento.
- Verificação de webhooks.
- Backups criptografados.
- Recuperação de desastres.

### Privacidade

- Minimizar dados pessoais.
- Definir finalidade do uso de GPS.
- Diferenciar localização operacional e histórica.
- Não rastrear motoristas quando a finalidade operacional terminar.
- Permitir solicitações de acesso e exclusão conforme a LGPD.
- Definir prazos de retenção justificáveis.
- Restringir acesso administrativo à localização.
- Registrar acessos a dados sensíveis.
- Ter política de privacidade própria.
- Aplicar consentimento quando essa for a base legal adequada.

### Operação brasileira

Preparar a plataforma para as exigências da Lei nº 13.640/2018, regulamentações municipais, documentação dos motoristas, segurança, seguros e demais obrigações aplicáveis.

Não considerar a plataforma legalmente pronta apenas por concluir o software.

---

# 20. SISTEMA ANTIFRAUDE

Implementar mecanismos para identificar:

- Contas duplicadas.
- Abuso de cupons.
- Cadastros automatizados.
- Dispositivos suspeitos.
- Uso irregular de localização simulada.
- Corridas fictícias.
- Cancelamentos abusivos.
- Tentativas repetidas de pagamento.
- Disputas fraudulentas.
- Manipulação de indicação.
- Conluio entre contas.

Gerar indicadores de risco e encaminhar casos relevantes para análise.

Não aplicar bloqueios definitivos exclusivamente por IP, dispositivo ou pontuação automatizada sem processo de revisão e contestação.

---

# 21. MULTICIDADES

Preparar a VOZTRI para operar em diferentes cidades.

Cada cidade poderá possuir:

- Polígono de atendimento.
- Categorias permitidas.
- Tarifas próprias.
- Comissões.
- Horários.
- Restrições operacionais.
- Campanhas.
- Motoristas.
- Parâmetros de despacho.
- Regras de cancelamento.

A cidade inicial deve ser configurável por ambiente, não fixada no código.

---

# 22. IDIOMAS

Implementar internacionalização desde o início.

Idiomas:

- Português brasileiro.
- Inglês.
- Espanhol.

Português será o idioma inicial.

Permitir troca manual de idioma.

Criar arquivos separados de tradução, evitando textos hardcoded.

---

# 23. INFRAESTRUTURA DOCKER

Todo o backend, painel administrativo, banco de dados, cache, filas, armazenamento e serviços de apoio deverão funcionar localmente com Docker.

Criar:

- Dockerfiles.
- Docker Compose.
- Volumes persistentes.
- Redes internas.
- Health checks.
- Scripts de inicialização.
- Seeds.
- Migrations.
- Workers.
- Scheduler.
- Serviço WebSocket.
- Monitoramento.
- Ambiente de teste.

O comando inicial deverá ser:

```bash
docker compose up -d --build
```

Após a inicialização:

- O backend deve estar acessível.
- O painel deve funcionar.
- O banco deve estar pronto.
- Redis deve estar operacional.
- WebSockets devem funcionar.
- Workers devem estar ativos.
- Os serviços cartográficos configurados devem responder.
- O ambiente de desenvolvimento deve conter dados de exemplo.

### Aplicativos Android

O aplicativo será compilado e executado em emulador ou dispositivo Android, conectando-se aos serviços Docker.

Não tentar executar um emulador Android dentro de containers comuns como requisito obrigatório.

Criar instruções e comandos para builds Android de desenvolvimento e release.

---

# 24. PREPARAÇÃO PARA IOS

Implementar uma arquitetura multiplataforma real.

### Regras

1. Compartilhar regras de negócio TypeScript.
2. Compartilhar cliente HTTP.
3. Compartilhar validações.
4. Compartilhar design tokens.
5. Isolar diferenças nativas.
6. Não depender de recursos exclusivos Android sem interface abstrata.
7. Preparar permissões iOS.
8. Preparar APNs.
9. Preparar Keychain.
10. Preparar configurações de build.
11. Documentar requisitos de assinatura.
12. Validar compatibilidade das bibliotecas utilizadas.

Criar uma camada de plataforma para:

```text
LocationProvider
NotificationProvider
SecureStorageProvider
PermissionsProvider
BackgroundTaskProvider
MapProvider
PaymentProvider
```

O Android deverá ser funcional inicialmente.

O iOS deverá possuir preparação arquitetural, sem exigir build completo nesta fase.

---

# 25. TESTES OBRIGATÓRIOS

Implementar testes automatizados.

## Backend

- PHPUnit/Pest.
- Testes unitários.
- Testes de integração.
- Testes de API.
- Testes de autorização.
- Testes financeiros.
- Testes de concorrência.
- Testes de idempotência.

## Mobile

- Jest.
- React Native Testing Library.
- Testes E2E com ferramenta compatível.
- Testes de navegação.
- Testes offline.
- Testes de permissão.
- Testes de atualização GPS.

## Performance

- k6 para carga.
- Testes de despacho simultâneo.
- Testes de WebSocket.
- Testes de localização.
- Testes de concorrência em corridas.
- Testes de filas.

### Cenários críticos

Testar obrigatoriamente:

- Dois motoristas aceitando simultaneamente.
- Passageiro solicitando corridas duplicadas.
- Motorista perdendo conexão.
- GPS desligado.
- Pagamento duplicado.
- Webhook repetido.
- Cancelamento durante corrida.
- Motorista saindo da área atendida.
- Alteração de tarifa durante solicitação.
- Falha de provedor externo.
- Recuperação após reinício dos containers.
- Reconexão do aplicativo após retorno da internet.

---

# 26. MONITORAMENTO

Criar observabilidade com:

- Logs estruturados.
- Identificador de correlação.
- Métricas da aplicação.
- Monitoramento de API.
- Monitoramento de banco.
- Filas.
- WebSockets.
- Tempo de busca por motorista.
- Tempo médio de aceite.
- Falhas de GPS.
- Falhas de pagamento.
- Latência de despacho.
- Taxa de cancelamento.
- Crash reports, mediante ferramenta configurada.

Preparar alertas operacionais.

---

# 27. DOCUMENTAÇÃO OBRIGATÓRIA

Criar e manter:

## CONTEXTO.md

Registrar:
- Objetivo.
- Arquitetura.
- Stack.
- Decisões técnicas.
- Funcionalidades existentes.
- Pendências.
- Estado atual.
- Próximas ações.

Atualizar automaticamente ao terminar cada etapa de desenvolvimento.

## DOCUMENTACAO.md

Descrever:
- Instalação.
- Configuração.
- Variáveis.
- Banco.
- Serviços.
- APIs.
- WebSockets.
- Integrações.
- Fluxos de negócios.
- Estrutura do projeto.
- Publicação Android.
- Preparação iOS.

## PASSOS.md

Registrar cada etapa com:

- Identificador.
- Objetivo.
- Tarefas.
- Dependências.
- Critérios de aceite.
- Testes.
- Status.

Status possíveis:

- PENDENTE.
- EM ANDAMENTO.
- CONCLUÍDO.
- BLOQUEADO.

Não considerar uma etapa concluída sem testes e validação.

---

# 28. PLANO DE DESENVOLVIMENTO

Dividir o projeto em fases executáveis.

## Fase 1 — Fundação

- Monorepo.
- Docker.
- Backend Laravel.
- PostgreSQL/PostGIS.
- Redis.
- React Native.
- Painel React.
- Design system.
- Autenticação.

## Fase 2 — Geolocalização

- MapLibre.
- Serviço de tiles.
- Busca de endereços.
- Rotas.
- GPS.
- WebSockets.
- Localização de motoristas.

## Fase 3 — Motorista

- Cadastro.
- Documentação.
- Aprovação.
- Veículos.
- Disponibilidade.
- Dashboard.

## Fase 4 — Passageiro

- Home.
- Origem.
- Destino.
- Categorias.
- Estimativa tarifária.
- Solicitações.

## Fase 5 — Motor de corridas

- Matching.
- Ofertas.
- Aceite.
- Máquina de estados.
- Rastreamento.
- Cancelamentos.
- Finalização.

## Fase 6 — Pagamentos

- Abstração de provedores.
- Pix.
- Cartão.
- Dinheiro.
- Ledger.
- Comissões.
- Repasses.

## Fase 7 — Experiência completa

- Chat.
- Notificações.
- Avaliações.
- Agendamento.
- Cupons.
- Favoritos.
- Segurança.
- Suporte.

## Fase 8 — Administração

- Dashboard.
- Gestão de usuários.
- Gestão de motoristas.
- Financeiro.
- Tarifas.
- Corridas ao vivo.
- Relatórios.
- Auditoria.

## Fase 9 — Qualidade

- Testes E2E.
- Testes de carga.
- Segurança.
- Observabilidade.
- Otimização.
- Recuperação de falhas.

## Fase 10 — Android

- Compilação de APK de teste.
- Geração de AAB.
- Configurações de release.
- Assinatura Android.
- Preparação Google Play.
- Verificações de permissões.
- Revisão de privacidade.
- Testes em dispositivos físicos.

## Fase 11 — Preparação iOS

- Auditoria de dependências.
- Ajustes multiplataforma.
- Configurações de notificações.
- Documentação de build iOS.
- Checklist Apple Developer.
- Checklist App Store.

Não realizar publicação real sem autorização e credenciais apropriadas.

---

# 29. CRITÉRIOS DE QUALIDADE

Não aceitar:

- Botões decorativos sem funcionamento.
- API simulada em fluxos de produção.
- Dados fictícios gravados como transações reais.
- Corridas sem persistência.
- Localização de motoristas apenas ilustrativa.
- Aceites sem proteção de concorrência.
- Pagamento sem confirmação do servidor.
- Falta de validação de usuário.
- Código duplicado desnecessariamente.
- Configurações sensíveis hardcoded.
- Credenciais expostas.
- Ausência de testes para regras críticas.
- Dependência de serviços gratuitos incompatíveis com uso comercial.

Todos os fluxos essenciais devem funcionar de ponta a ponta.

Quando uma funcionalidade depender de contrato, API paga ou credencial, implementar uma abstração e um modo sandbox claramente identificado, sem simular sucesso em ambiente de produção.

---

# 30. INSTRUÇÕES FINAIS PARA O AGENTE

Você será responsável pela arquitetura e implementação técnica da VOZTRI.

Siga estas regras:

1. Analise os protótipos e a identidade visual fornecidos.
2. Planeje a arquitetura completa.
3. Crie os arquivos de documentação.
4. Divida o desenvolvimento em etapas.
5. Implemente código de produção, não apenas demonstrações.
6. Utilize bibliotecas maduras e mantidas.
7. Priorize soluções gratuitas e open source compatíveis com uso comercial.
8. Preserve independência de provedores externos.
9. Valide cada fluxo com testes.
10. Corrija erros antes de avançar.
11. Atualize CONTEXTO.md e PASSOS.md após cada etapa.
12. Evite mudanças arquiteturais sem justificativa.
13. Não declare integração concluída quando houver apenas mock.
14. Preserve a compatibilidade futura com iOS.
15. Mantenha toda a infraestrutura de desenvolvimento executável via Docker.
16. Documente custos e limitações dos provedores externos.
17. Garanta que a lógica crítica seja validada pelo backend.
18. Crie dados de demonstração apenas em ambiente de desenvolvimento.
19. Prepare ambiente de produção separado.
20. Não omita segurança, conformidade e testes em nome da velocidade.

## ORDEM DE EXECUÇÃO

Primeiro, realize a análise arquitetural e crie:

- Estrutura do monorepo.
- CONTEXTO.md.
- DOCUMENTACAO.md.
- PASSOS.md.
- Arquitetura dos módulos.
- Modelo inicial do banco.
- Estratégia de mapas.
- Estratégia de GPS.
- Estratégia de pagamentos.
- Estratégia Android/iOS.
- Plano de testes.

Depois, implemente a Fase 1.

As etapas seguintes poderão ser executadas com comandos como:

**"INICIE O PASSO 2"**

O objetivo final é entregar uma plataforma de mobilidade urbana funcional, confiável, escalável e pronta para evoluir comercialmente, com experiência competitiva em relação aos principais aplicativos de transporte do mercado brasileiro.