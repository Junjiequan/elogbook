import { join } from 'node:path';

const configDir = process.env.CONFIG_DIR || 'config';

const list = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const flag = (value: string | undefined, fallback: boolean): boolean =>
  value === undefined || value === ''
    ? fallback
    : ['true', '1', 'yes'].includes(value.toLowerCase());

/**
 * The one place that reads environment variables. The rest of the code asks `ConfigService`
 * (`config.get('jwt.secret')`), so a setting has a name, a type and a default in a single file.
 */
export const configuration = () => ({
  environment: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  corsOrigins: list(process.env.CORS_ORIGINS),
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : undefined,
  maxBodySizeMb: Number(process.env.MAX_BODY_SIZE_MB ?? 25),
  swaggerEnabled: flag(process.env.SWAGGER_ENABLED, process.env.NODE_ENV !== 'production'),
  database: {
    url: process.env.DATABASE_URL as string,
    migrate: flag(process.env.DATABASE_MIGRATE, true),
  },
  jwt: {
    secret: process.env.JWT_SECRET as string,
    expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 8 * 60 * 60),
  },
  auth: {
    allowRegistration: flag(process.env.AUTH_ALLOW_REGISTRATION, true),
    adminEmails: list(process.env.ADMIN_EMAILS).map((email) => email.toLowerCase()),
  },
  // The folder for JSON files that describe a deployment (accounts today, more over time). The real files
  // are git-ignored; `*.example.json` next to them are the starting points.
  configDir,
  proposals: {
    // The proposals the app offers (see config/proposals.example.json). A missing default file means none.
    file: process.env.PROPOSALS_FILE || join(configDir, 'proposals.json'),
    explicit: !!process.env.PROPOSALS_FILE,
  },
  // On when OAUTH_ISSUER is set.
  oauth: {
    enabled: flag(process.env.OAUTH_ENABLED, true),
    label: process.env.OAUTH_LABEL,
    issuer: process.env.OAUTH_ISSUER,
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    clientAuthentication: process.env.OAUTH_CLIENT_AUTHENTICATION,
    redirectUri: process.env.OAUTH_REDIRECT_URI,
    frontendUrl: process.env.OAUTH_FRONTEND_URL,
    scopes: list(process.env.OAUTH_SCOPES?.replace(/\s+/g, ',')),
    allowedEmailDomains: list(process.env.OAUTH_ALLOWED_EMAIL_DOMAINS),
    createAccounts: flag(process.env.OAUTH_CREATE_ACCOUNTS, true),
  },
  localAccounts: {
    // Accounts (with roles such as admin) made when the API starts. A missing default file is fine;
    // a file that was asked for by name and is missing is an error.
    file: process.env.LOCAL_ACCOUNTS_FILE || join(configDir, 'local-accounts.json'),
    explicit: !!process.env.LOCAL_ACCOUNTS_FILE,
  },
  rateLimit: {
    default: Number(process.env.RATE_LIMIT ?? 120),
    auth: Number(process.env.AUTH_RATE_LIMIT ?? 10),
  },
});

export type AppConfig = ReturnType<typeof configuration>;
