const path = require('path');

/**
 * Jest com o preset oficial do React Native (componentes nativos simulados).
 * Ajustes para o monorepo:
 * - transform: usa explicitamente o babel.config.js do app, porque os pacotes
 *   em ../../packages ficam fora desta pasta e não teriam configuração Babel;
 * - moduleNameMapper: @voztri/* aponta para o src dos pacotes, e imports
 *   relativos com ".js" (convenção NodeNext do TypeScript) perdem a extensão.
 */
module.exports = {
  preset: 'react-native',
  rootDir: __dirname,
  testMatch: ["<rootDir>/__tests__/**/*.test.[jt]s?(x)"],
  transform: {
    '^.+\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: path.join(__dirname, 'babel.config.js') }],
  },
  moduleNameMapper: {
    '^@voztri/(.*)$': '<rootDir>/../../packages/$1/src/index.ts',
    '^(\.{1,2}/.*)\.js$': '$1',
  },
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native|@react-native(-community)?)/)'],
};
