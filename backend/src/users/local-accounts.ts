import { Role } from '../auth/role.enum.js';
import { normaliseEmail } from './users.service.js';

/** One account of the local accounts file (`local-accounts.json`). */
export interface LocalAccount {
  email: string;
  name: string;
  /** Roles the account holds, e.g. `["admin"]`. */
  roles: string[];
  /** Either the password in the clear (it is hashed before it is stored), or ... */
  password?: string;
  /** ... a hash made by this API (`scrypt$...`), for a file that must not contain passwords. */
  passwordHash?: string;
}

const KNOWN_ROLES: string[] = Object.values(Role);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Accounts that can delete other people's logbooks get a longer password than a sign-up needs. */
export const MIN_PASSWORD_LENGTH = 8;
export const MIN_ADMIN_PASSWORD_LENGTH = 12;
/** The example file's passwords start like this: they must never survive into production. */
export const PLACEHOLDER_PASSWORD = /^CHANGE-ME/i;

/**
 * Checks the content of the local accounts file, and says everything that is wrong with it at once.
 * `production` additionally refuses the example file's placeholder passwords.
 */
export function parseLocalAccounts(
  json: unknown,
  options: { production: boolean },
): LocalAccount[] {
  if (!Array.isArray(json)) {
    throw new Error(
      'The local accounts file must contain a list of accounts: [ { "email": ... } ].',
    );
  }
  const problems: string[] = [];
  const seen = new Set<string>();
  const accounts: LocalAccount[] = [];

  json.forEach((entry: unknown, index) => {
    const label = `account ${index + 1}`;
    if (typeof entry !== 'object' || entry === null) {
      problems.push(`${label}: must be an object`);
      return;
    }
    const { email, name, roles, password, passwordHash } = entry as Record<string, unknown>;
    const who = typeof email === 'string' ? email : label;

    if (typeof email !== 'string' || !EMAIL.test(email.trim())) {
      problems.push(`${label}: "email" must be an email address`);
      return;
    }
    const key = normaliseEmail(email);
    if (seen.has(key)) {
      problems.push(`${who}: listed twice`);
    }
    seen.add(key);

    if (typeof name !== 'string' || name.trim() === '') {
      problems.push(`${who}: "name" is required`);
    }
    if (
      !Array.isArray(roles) ||
      roles.some((role) => typeof role !== 'string' || !KNOWN_ROLES.includes(role))
    ) {
      problems.push(`${who}: "roles" must be a list of: ${KNOWN_ROLES.join(', ')}`);
    }
    const isAdmin = Array.isArray(roles) && roles.includes(Role.Admin);

    if ((password === undefined) === (passwordHash === undefined)) {
      problems.push(`${who}: give either "password" or "passwordHash", not both and not neither`);
    } else if (password !== undefined) {
      const least = isAdmin ? MIN_ADMIN_PASSWORD_LENGTH : MIN_PASSWORD_LENGTH;
      if (typeof password !== 'string' || password.length < least) {
        problems.push(`${who}: "password" must be at least ${least} characters`);
      } else if (options.production && PLACEHOLDER_PASSWORD.test(password)) {
        problems.push(`${who}: "password" is still the placeholder from the example file`);
      }
    } else if (typeof passwordHash !== 'string' || !passwordHash.startsWith('scrypt$')) {
      problems.push(`${who}: "passwordHash" must be a hash made by this API (scrypt$...)`);
    }

    accounts.push({
      email: key,
      name: typeof name === 'string' ? name.trim() : '',
      roles: Array.isArray(roles) ? [...new Set(roles as string[])].sort() : [],
      password: typeof password === 'string' ? password : undefined,
      passwordHash: typeof passwordHash === 'string' ? passwordHash : undefined,
    });
  });

  if (problems.length > 0) {
    throw new Error(`The local accounts file is not valid:\n - ${problems.join('\n - ')}`);
  }
  return accounts;
}
