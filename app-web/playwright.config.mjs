import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1, timeout: 60000, retries: 0, reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:5183', viewport: { width: 390, height: 844 }, trace: 'off', screenshot: 'only-on-failure' },
  webServer: { command: 'node node_modules/vite/bin/vite.js --mode emulator --host 127.0.0.1 --port 5183 --strictPort', url: 'http://127.0.0.1:5183', reuseExistingServer: true }
});
