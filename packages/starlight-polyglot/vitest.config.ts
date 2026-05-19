import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: [
      'tests/benches/**',
      'tests/fuzz/**',
      'node_modules/**',
      'dist/**',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'core/**',
        'handlers/**',
        'index.ts',
      ],
      exclude: [
        'tests/**',
        'dist/**',
        'scripts/**',
        'node_modules/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.bench.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 85,
        branches: 85,
        statements: 90,
      },
      reporter: ['text', 'json-summary', 'lcov', 'html'],
      all: true,
      clean: true,
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    retry: process.env.CI ? 2 : 0,
    maxConcurrency: 8,
    maxRetries: 2,
    sequence: {
      concurrent: true,
      shuffle: false,
    },
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
      include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
      },
    },
    env: {
      NODE_ENV: 'test',
      NODE_OPTIONS: '--experimental-vm-modules',
    },
    reporters: [
      'default',
      'verbose',
    ],
    outputFile: {
      json: './coverage/test-results.json',
    },
    css: false,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    includeTaskLocation: true,
  },
});
