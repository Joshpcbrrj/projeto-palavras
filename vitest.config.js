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
    },
  },
});
