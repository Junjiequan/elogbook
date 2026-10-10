// Writes config.json next to the built app so one build can point at any API: API_URL=https://api.example.org/api/v1
import { mkdirSync, writeFileSync } from 'node:fs';

const apiUrl = process.env.API_URL?.trim();
if (!apiUrl) {
  console.error('API_URL is not set (for example https://elogbook-api.onrender.com/api/v1).');
  process.exit(1);
}
const dir = 'dist/elogbook/browser';
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/config.json`, `${JSON.stringify({ apiUrl }, null, 2)}\n`);
console.log(`${dir}/config.json: apiUrl = ${apiUrl}`);
