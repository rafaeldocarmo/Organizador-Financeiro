import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    // Mesmo alias do tsconfig ("@/*" -> "./*").
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    // Só lógica pura por enquanto: nada em lib/ precisa de DOM.
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
