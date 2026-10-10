/** Lower limit for the routes worth guessing at. */
export const authLimit = {
  default: { limit: () => Number(process.env.AUTH_RATE_LIMIT ?? 10), ttl: 60_000 },
};
