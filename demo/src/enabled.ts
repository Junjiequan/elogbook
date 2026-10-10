/**
 * Dummy logbooks are only made when `ENABLE_DEMO` (or `enable_demo`) is explicitly set to `true`. Unset, `false`, `TRUE`, `1`, anything
 * else: nothing is made. It guards against filling a real database by running the script by mistake.
 */
export const isDemoEnabled = (env: Record<string, string | undefined>): boolean =>
  (env.ENABLE_DEMO ?? env.enable_demo) === 'true';

export const NOT_ENABLED = `Dummy logbooks are not enabled, so none were made.
Set ENABLE_DEMO=true in backend/.env (or in the environment) to allow it. Only the exact value "true" counts.`;
