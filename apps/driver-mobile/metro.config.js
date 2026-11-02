const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/**
 * Configuração do Metro para o monorepo VOZTRI.
 *
 * - watchFolders: o Metro precisa enxergar packages/ (os @voztri/* são
 *   symlinks de workspace e apontam, pelo campo "react-native" do
 *   package.json, direto para src/index.ts, sem exigir build).
 * - resolveRequest: o código segue a convenção do TypeScript "NodeNext", em
 *   que imports relativos levam ".js" mesmo apontando para ".ts"/".tsx"
 *   (ex.: './colors.js' -> colors.ts). O Metro 0.80 não faz essa troca; se o
 *   ".js" não existir, tentamos o mesmo caminho sem a extensão e o Metro
 *   procura pelas sourceExts (.ts, .tsx, ...).
 */
const config = {
  // VOZTRI_API_URL é embutida no código pelo Babel (babel.config.js), mas não faz parte da
  // chave do cache de transformação: sem isto, trocar o valor reaproveitaria o código antigo.
  cacheVersion: `voztri-api-url:${process.env.VOZTRI_API_URL ?? ''}`,
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [path.join(projectRoot, 'node_modules'), path.join(monorepoRoot, 'node_modules')],
    resolveRequest: (context, moduleName, platform) => {
      try {
        return context.resolveRequest(context, moduleName, platform);
      } catch (error) {
        if (/^\.{1,2}\//.test(moduleName) && moduleName.endsWith('.js')) {
          return context.resolveRequest(context, moduleName.slice(0, -3), platform);
        }
        throw error;
      }
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
