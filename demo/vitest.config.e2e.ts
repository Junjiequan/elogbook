import { defineConfig } from 'vitest/config';

// Runs the tool against a real PostgreSQL whose tables exist (the API creates them: run the backend's
// e2e tests first, which is what `npm run test:e2e` at the repository root does).
export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgres://elogbook:elogbook@localhost:5433/elogbook_test',
    },
  },
});
