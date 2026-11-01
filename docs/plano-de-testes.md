# Plano Abrangente de Testes Automatizados da VOZTRI

## 1. Níveis de Teste
1. **Unitários & Domínio**:
   - Validação de cálculos tarifários com precisão decimal exata (`FareCalculatorTest`).
   - Máquina de estados de corridas: transições permitidas e bloqueio de transições ilegais (`RideStateMachineTest`).
   - Ledger financeiro de partidas dobradas (`LedgerTest`).
2. **Integração & API**:
   - Endpoints de autenticação OTP e emissão de token Sanctum (`AuthenticationTest`).
   - Requisição de corrida, cálculo de estimativa e cancelamento (`RideLifecycleTest`).
3. **Concorrência & Idempotência**:
   - Dois motoristas tentando aceitar a mesma corrida simultaneamente via locks atômicos (`ConcurrentRideAcceptanceTest`).
   - Reenvio de requisições de pagamento com o mesmo cabeçalho `Idempotency-Key` (`IdempotencyTest`).
4. **Carga & Performance**:
   - Script de teste k6 simulando 100 usuários solicitando corridas concorrentes e 50 motoristas transmitindo coordenadas de GPS por WebSocket.
