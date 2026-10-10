// Used by `ng serve` only: the browser talks to the dev server, which forwards /api to the API, so the
// app can use the same relative address (/api/v1) in development as in production, with no CORS.
// In Docker the target is the backend container (API_PROXY_TARGET, set in docker-compose.yaml).
export default [
  {
    context: ['/api'],
    target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    secure: false,
    changeOrigin: true,
  },
];
