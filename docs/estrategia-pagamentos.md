# Estratégia de Pagamentos, Repasses e Ledger Financeiro

## 1. Princípios Financeiros
1. **Representação Inteira em Centavos**: Para evitar erros clássicos de arredondamento IEEE 754 (float), todos os valores monetários são armazenados e calculados em centavos inteiros (`BIGINT`).
2. **Ledger Imutável de Partidas Dobradas**: Cada transação gera pelo menos dois registros compensatórios (débito em uma conta e crédito em outra), garantindo soma zero e auditoria contábil completa.
3. **Múltiplos Métodos de Pagamento**:
   - **Pix Dinâmico**: QR Code instantâneo gerado pelo backend via webhook direto com o provedor (ex: Asaas / Mercado Pago). A corrida só é concluída após a confirmação do webhook com HMAC SHA-256 verificado.
   - **Cartão de Crédito com Tokenização**: O aplicativo móvel nunca armazena nem envia números de cartão ou CVV para o backend. O cartão é tokenizado diretamente no SDK do provedor (`token_card`), enviando apenas o token para cobrança ou pré-autorização.
   - **Dinheiro**: O passageiro paga em espécie diretamente ao motorista no final da corrida. A taxa de intermediação da plataforma (ex: 15%) é debitada como saldo negativo na carteira do motorista para ser compensada em repasses futuros de Pix/cartão.
   - **Carteira Digital (Saldo)**: Passageiro e motorista possuem saldo pré-pago auditável.

## 2. Split e Repasses aos Motoristas
- O motorista pode solicitar repasse via Pix para sua chave cadastrada (CPF, Telefone ou Chave Aleatória).
- O backend valida se o saldo disponível cobre o valor solicitado e a taxa de transferência antes de registrar a transação de saque.

