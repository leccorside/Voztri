# Checklist de Publicação na Google Play Console — VOZTRI

Este guia detalha todos os requisitos obrigatórios para aprovação e publicação dos aplicativos de Passageiro e Motorista na Google Play Store.

## 1. Declaração de Permissão de Localização em Segundo Plano (Background Location)
- **Justificativa Exigida**: O aplicativo do Motorista necessita de `ACCESS_BACKGROUND_LOCATION` para permitir o despacho de corridas e o rastreamento GPS contínuo enquanto o motorista utiliza navegadores externos (Waze / Google Maps).
- **Vídeo de Demonstração**: Gravação em dispositivo real demonstrando o app em segundo plano recebendo uma oferta de corrida e transmitindo telemetria.

## 2. Segurança de Dados e LGPD (Data Safety Section)
- **Localização Exata**: Coletada e associada à identidade do usuário para finalidades de funcionalidade do app, segurança e prevenção a fraudes.
- **Informações Financeiras**: Dados de pagamento gerenciados por gateway PCI-DSS certificado (nenhum dado de cartão cru é armazenado nos servidores da VOZTRI).
- **Criptografia em Trânsito**: Todas as conexões utilizam HTTPS/TLS 1.3 obrigatório e WebSockets protegidos (WSS).

## 3. Conformidade Regulatória (Lei nº 13.640/2018)
- Verificação documental obrigatória (CNH com EAR e seguro APP de acidentes pessoais a passageiros) antes de habilitar o motorista para corridas.
