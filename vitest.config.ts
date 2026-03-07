import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'functions', '.next', 'backend'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules', 'functions', '.next', 'backend', '**/*.config.*', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
