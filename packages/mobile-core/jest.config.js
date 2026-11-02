const path = require('path');

/**
 * Jest do @voztri/mobile-core, com o preset oficial do React Native (componentes
 * nativos simulados), como nos apps:
 * - transform: usa o babel.config.js deste pacote (os outros pacotes @voztri/* ficam
 *   fora desta pasta e não teriam configuração Babel);
 * - moduleNameMapper: @voztri/* aponta para o src dos pacotes e imports relativos com
 *   ".js" (convenção NodeNext do TypeScript) perdem a extensão;
 * - setupFiles: simula o React Native Firebase como "não configurado" (o push.test.ts
 *   declara o próprio mock).
 */
// O config.ts lê VOZTRI_API_URL (embutida pelo Babel nos apps); aqui os testes usam sempre o padrão
delete process.env.VOZTRI_API_URL;

module.exports = {
  preset: 'react-native',
  rootDir: __dirname,
  testMatch: ['<rootDir>/__tests__/**/*.test.[jt]s?(x)'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: path.join(__dirname, 'babel.config.js') }],
  },
  moduleNameMapper: {
    '^@voztri/(.*)$': '<rootDir>/../$1/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native|@react-native(-community)?)/)'],
};
