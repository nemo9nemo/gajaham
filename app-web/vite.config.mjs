import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const domain = fileURLToPath(new URL('../functions/src/domain.mjs', import.meta.url));
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'emulator') throw new Error('Emulator 모드로 배포 번들을 만들 수 없습니다.');
  const env = loadEnv(mode, root, 'GAJAHAM_');
  const config = {
    apiKey: env.GAJAHAM_API_KEY ?? '', projectId: env.GAJAHAM_PROJECT_ID ?? '',
    authDomain: env.GAJAHAM_AUTH_DOMAIN ?? '', appId: env.GAJAHAM_APP_ID ?? '',
    appCheckKey: env.GAJAHAM_APP_CHECK_KEY ?? '', origin: env.GAJAHAM_ORIGIN ?? '',
    contact: env.GAJAHAM_CONTACT ?? '', apiOrigin: env.GAJAHAM_API_ORIGIN ?? '',
    operatorName: env.GAJAHAM_OPERATOR_NAME ?? '', policyDate: env.GAJAHAM_POLICY_DATE ?? '', processingNotice: env.GAJAHAM_PROCESSING_NOTICE ?? ''
  };
  return {
    resolve: { alias: { '#domain': domain } },
    define: { __LOCAL_EMULATOR__: JSON.stringify(command === 'serve' && mode === 'emulator'), __PUBLIC_CONFIG__: JSON.stringify(config) },
    build: { sourcemap: false, target: 'es2022', rolldownOptions: { input: { main: root + 'index.html', privacy: root + 'privacy/index.html' } } },
    server: { host: '127.0.0.1', port: 5183, strictPort: true, fs: { allow: [root, domain] }, headers: { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' } },
    preview: { host: '127.0.0.1', port: 5183, strictPort: true }
  };
});
