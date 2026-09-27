import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Emulator-backed suites share one database, so run files serially.
    fileParallelism: false,
    env: {
      GCLOUD_PROJECT: 'demo-darna-eats',
      FUNCTIONS_EMULATOR: 'true',
    },
  },
});
