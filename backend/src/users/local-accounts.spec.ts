import { parseLocalAccounts } from './local-accounts.js';

const development = { production: false };
const production = { production: true };
const admin = (over: object = {}) => ({
  email: 'Admin@Example.org',
  name: ' Admin ',
  roles: ['admin', 'admin'],
  password: 'a-long-enough-password',
  ...over,
});

describe('parseLocalAccounts', () => {
  it('accepts accounts, tidying the email, the name and the roles', () => {
    expect(parseLocalAccounts([admin()], development)).toEqual([
      {
        email: 'admin@example.org',
        name: 'Admin',
        roles: ['admin'],
        password: 'a-long-enough-password',
        passwordHash: undefined,
      },
    ]);
  });

  it('accepts a password hash instead of a password', () => {
    const [account] = parseLocalAccounts(
      [admin({ password: undefined, passwordHash: 'scrypt$salt$hash' })],
      development,
    );
    expect(account.passwordHash).toBe('scrypt$salt$hash');
    expect(account.password).toBeUndefined();
  });

  it('wants a list', () => {
    expect(() => parseLocalAccounts({ email: 'a@example.org' }, development)).toThrowError(
      /list of accounts/,
    );
  });

  it('names every problem at once, with the account it belongs to', () => {
    expect(() =>
      parseLocalAccounts(
        [
          admin({ email: 'one@example.org', name: '' }),
          admin({ email: 'two@example.org', roles: ['root'] }),
          admin({ email: 'not an email' }),
        ],
        development,
      ),
    ).toThrowError(
      /one@example.org: "name"[\s\S]*two@example.org: "roles"[\s\S]*account 3: "email"/,
    );
  });

  it('refuses an account listed twice, whatever the capital letters', () => {
    expect(() =>
      parseLocalAccounts([admin(), admin({ email: 'admin@example.org' })], development),
    ).toThrowError(/listed twice/);
  });

  it('needs exactly one of password and passwordHash', () => {
    expect(() => parseLocalAccounts([admin({ password: undefined })], development)).toThrowError(
      /either "password" or "passwordHash"/,
    );
    expect(() =>
      parseLocalAccounts([admin({ passwordHash: 'scrypt$a$b' })], development),
    ).toThrowError(/either "password" or "passwordHash"/);
  });

  it('wants a longer password for an administrator than for anyone else', () => {
    expect(() =>
      parseLocalAccounts([admin({ password: 'short-pass1' })], development),
    ).toThrowError(/at least 12/);
    expect(() =>
      parseLocalAccounts([admin({ roles: [], password: 'short-pass1' })], development),
    ).not.toThrow();
    expect(() =>
      parseLocalAccounts([admin({ roles: [], password: 'short' })], development),
    ).toThrowError(/at least 8/);
  });

  it('refuses the example file’s placeholder passwords in production only', () => {
    const placeholder = admin({ password: 'CHANGE-ME-first-admin' });

    expect(() => parseLocalAccounts([placeholder], development)).not.toThrow();
    expect(() => parseLocalAccounts([placeholder], production)).toThrowError(/placeholder/);
  });

  it('refuses a hash that this API did not make', () => {
    expect(() =>
      parseLocalAccounts([admin({ password: undefined, passwordHash: '$2b$10$abc' })], development),
    ).toThrowError(/scrypt/);
  });
});
