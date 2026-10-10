/**
 * Stops the API at start-up, with a clear message, when a required setting is missing or unusable,
 * instead of failing later on the first login or query.
 */
export function validateEnv(env: Record<string, unknown>): Record<string, unknown> {
  const problems: string[] = [];

  if (typeof env.DATABASE_URL !== 'string' || !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) {
    problems.push('DATABASE_URL must be a postgres:// connection string');
  }
  if (typeof env.JWT_SECRET !== 'string' || env.JWT_SECRET.length < 32) {
    problems.push('JWT_SECRET must be set to a random string of at least 32 characters');
  }
  for (const name of [
    'PORT',
    'JWT_EXPIRES_IN',
    'MAX_BODY_SIZE_MB',
    'RATE_LIMIT',
    'AUTH_RATE_LIMIT',
  ]) {
    const value = env[name];
    if (value !== undefined && value !== '' && !(Number(value) > 0)) {
      problems.push(`${name} must be a positive number`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid environment:\n - ${problems.join('\n - ')}`);
  }
  return env;
}
