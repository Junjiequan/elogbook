// Creates backend/.env (with a fresh random JWT_SECRET) and backend/config/local-accounts.json (the example's admin
// accounts, each with its own random password). Never overwrites a file that exists.
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) {
  console.log('backend/.env already exists: left as it is.');
} else {
  const secret = randomBytes(48).toString('base64');
  // The example explains itself; the real file stays clean: no comments, no stacked blank lines.
  const text = readFileSync('.env.example', 'utf8')
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`)
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '');
  writeFileSync('.env', text, { mode: 0o600 });
  console.log('Created backend/.env with a new random JWT_SECRET (the file is git-ignored).');
}

const accountsFile = 'config/local-accounts.json';
if (existsSync(accountsFile)) {
  console.log(`backend/${accountsFile} already exists: left as it is.`);
} else {
  const accounts = JSON.parse(readFileSync('config/local-accounts.example.json', 'utf8')).map(
    (account) => ({
      ...account,
      password: randomBytes(18).toString('base64url'),
    }),
  );
  mkdirSync('config', { recursive: true });
  writeFileSync(accountsFile, `${JSON.stringify(accounts, null, 2)}\n`, { mode: 0o600 });
  console.log(
    `Created backend/${accountsFile}: ${accounts.length} admin accounts (${accounts
      .map((a) => a.email)
      .join(
        ', ',
      )}). Their passwords are in the file (git-ignored); the API creates the accounts when it starts.`,
  );
}

const proposalsFile = 'config/proposals.json';
if (existsSync(proposalsFile)) {
  console.log(`backend/${proposalsFile} already exists: left as it is.`);
} else {
  copyFileSync('config/proposals.example.json', proposalsFile);
  console.log(
    `Created backend/${proposalsFile} from the example (edit it to offer your own proposals).`,
  );
}
