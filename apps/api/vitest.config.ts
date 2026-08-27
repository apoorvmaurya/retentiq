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
        'src/index.ts',
        'src/lib/db.ts',
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
        lines: 70,
        branches: 60,
        functions: 70,
        statements: 70,
      },
    },
  },
});
