/**
 * Simulação global do React Native Firebase nos testes: o índice do
 * @voztri/mobile-core (kit de UI, usePolling, API) também exporta o push, e o Jest
 * não transforma o ESM do RNFB. O estado simulado é "Firebase não configurado"
 * (nenhum app criado), igual ao ambiente de desenvolvimento sem google-services.
 * Os testes de push declaram o próprio jest.mock, que tem prioridade.
 */
jest.mock('@react-native-firebase/app', () => ({ __esModule: true, default: { apps: [] } }));
jest.mock('@react-native-firebase/messaging', () => ({ __esModule: true, default: () => ({}) }));
