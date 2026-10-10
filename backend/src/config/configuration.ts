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
  rateLimit: {
    default: Number(process.env.RATE_LIMIT ?? 120),
    auth: Number(process.env.AUTH_RATE_LIMIT ?? 10),
  },
});

export type AppConfig = ReturnType<typeof configuration>;
