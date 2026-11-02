/**
 * Simulação global do React Native Firebase nos testes do pacote: o índice também
 * exporta o push, e o Jest não transforma o ESM do RNFB. Estado simulado: "Firebase
 * não configurado" (nenhum app criado). O push.test.ts declara o próprio jest.mock,
 * que tem prioridade.
 */
jest.mock('@react-native-firebase/app', () => ({ __esModule: true, default: { apps: [] } }));
jest.mock('@react-native-firebase/messaging', () => ({ __esModule: true, default: () => ({}) }));
