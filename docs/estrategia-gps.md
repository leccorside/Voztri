# Estratégia de Rastreamento GPS e Tempo Real

## 1. Visão Geral do Ciclo de Localização
O rastreamento de motoristas no VOZTRI combina baixa latência, economia de bateria e precisão milimétrica nas fases ativas da corrida:

```
[ Motorista Mobile ]
  ├── Foreground Service (Android) / Background Location Manager
  ├── Amostragem: 3s (em corrida) ou 10s (disponível online)
  ├── Filtro Kalman local (elimina jitter e imprecisão de GPS)
  ▼
[ WebSocket WSS / HTTPS Batch ]
  ▼
[ Redis: GEOADD driver_geo {lng} {lat} {driver_id} ]
  ├── Expiração automática (TTL 30s) para evitar "motoristas fantasmas"
  ├── Busca por raio: GEORADIUS / GEOSEARCH com O(log N)
  ▼
[ Laravel Reverb WebSocket Broadcast ]
  ▼
[ Passageiro Mobile / Painel Admin ]
  ├── Interpolação suave de marcador na tela (60 FPS)
```

## 2. Conformidade LGPD & Otimização de Bateria
- **Desconexão Obrigatória**: O rastreamento só ocorre se o motorista estiver explicitamente em modo `ONLINE` ou em corrida ativa. Ao ficar `OFFLINE`, o serviço é encerrado imediatamente.
- **Histórico Condensado**: Coordenadas brutas segundo a segundo são descartadas após 7 dias, mantendo apenas a polilinha sintetizada da viagem para fins legais e fiscais.
