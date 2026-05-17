import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/starlight-polyglot/tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      include: [
        'packages/starlight-polyglot/core/**',
        'packages/starlight-polyglot/handlers/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
});
