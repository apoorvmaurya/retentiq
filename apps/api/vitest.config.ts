import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./src/testGlobalSetup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/config.ts',
        'src/server.ts',
        'src/lib/db.ts',
        'src/workers/**',
        'src/integrations/**',
        'src/routes/alerts.ts',
        'src/routes/analytics.ts',
        'src/routes/cron.ts',
        'src/routes/customers.ts',
        'src/routes/healthScores.ts',
        'src/routes/integrations.ts',
        'src/routes/playbooks.ts',
        'src/routes/settings.ts',
        'src/routes/tasks.ts',
        'src/routes/users.ts',
        'src/lib/featureEngine.ts',
        'src/testGlobalSetup.ts',
        '**/*.test.ts',
        'dist/**',
      ],
      thresholds: {
        statements: 90,
        branches: 75,
        functions: 90,
        lines: 90,
      },
    },
  },
});
