import { defineConfig } from 'vitest/config';

// The e2e specs run the real app against a real PostgreSQL database (`npm run db:up` from the repo
// root starts one). They share that database, so they must not run in parallel.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgres://elogbook:elogbook@localhost:5433/elogbook_test',
      DATABASE_MIGRATE: 'true',
      JWT_SECRET: 'e2e-only-secret-that-is-at-least-32-characters-long',
      ADMIN_EMAILS: 'admin@example.org',
      RATE_LIMIT: '100000',
      AUTH_RATE_LIMIT: '100000',
      SWAGGER_ENABLED: 'false',
      // The tests must not depend on a developer's own backend/.env or config/ folder.
      CONFIG_DIR: './test/no-config',
      // empty = off; the OAuth specs set their own
      OAUTH_ISSUER: '',
      OAUTH_ENABLED: 'true',
    },
  },
});
