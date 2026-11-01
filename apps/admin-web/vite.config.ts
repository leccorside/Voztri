import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Porta 3000 é usada por outros stacks locais; 3010 é o padrão do VOZTRI.
  const port = Number(env.ADMIN_WEB_PORT || 3010);
  // Destino do proxy /api: o Nginx do docker-compose (FORWARD da porta 8080).
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [react()],
    resolve: {
      // Os pacotes do monorepo não têm build (dist/); o Vite compila direto do src.
      alias: {
        '@voztri/api-client': pkg('api-client'),
        '@voztri/design-tokens': pkg('design-tokens'),
        '@voztri/shared-types': pkg('shared-types'),
      },
      // O admin-web é instalado isolado (sem workspaces, ver CONTEXTO.md); estas
      // dependências importadas pelos pacotes em ../../packages são resolvidas
      // a partir do node_modules do próprio admin-web.
      dedupe: ['axios', 'react', 'react-dom'],
    },
    server: {
      port,
      strictPort: true,
      host: true,
      // O navegador chama /api/v1 na mesma origem do painel e o Vite repassa à API,
      // sem depender de CORS em desenvolvimento.
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
    preview: { port, strictPort: true },
  };
});
