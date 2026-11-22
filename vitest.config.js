import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['js/**/*.js'],
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        statements: 75,
        branches: 80,
        functions: 80,
        lines: 75,
      },
    },
  },
});
