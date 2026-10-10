// Creates backend/.env from .env.example with a fresh random JWT_SECRET. Never overwrites an existing .env.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) {
  console.log('backend/.env already exists: left as it is.');
} else {
  const secret = randomBytes(48).toString('base64');
  const text = readFileSync('.env.example', 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
  writeFileSync('.env', text, { mode: 0o600 });
  console.log('Created backend/.env with a new random JWT_SECRET (the file is git-ignored).');
}
