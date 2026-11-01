import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Rampa de subida para 50 VUs
    { duration: '1m', target: 100 },  // Mantém 100 usuários concorrentes
    { duration: '30s', target: 0 },   // Rampa de descida
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% das requisições devem responder em menos de 300ms
    http_req_failed: ['rate<0.01'],   // Menos de 1% de falhas
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8080/api/v1';

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  // 2. Cálculo de Estimativa Tarifária
  const estimatePayload = JSON.stringify({
    origin: {
      address: 'Av. Paulista, 1578',
      latitude: -23.561414,
      longitude: -46.655881,
    },
    destination: {
      address: 'Av. Faria Lima, 3477',
      latitude: -23.585721,
      longitude: -46.679199,
    },
  });

  const estimateRes = http.post(`${BASE_URL}/rides/estimate`, estimatePayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(estimateRes, {
    'estimate status is 200': (r) => r.status === 200,
    'has 4 categories': (r) => r.json().length === 4,
  });

  sleep(1);
}
