import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
// scrypt cost: OWASP's minimum recommendation (N=2^17, r=8, p=1) needs ~128 MB; N=2^15 with r=8 is
// the common middle ground for an interactive login and stays well within the default memory limit.
const COST = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

const derive = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scrypt(password, salt, KEY_LENGTH, COST, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );

/** `scrypt$<salt>$<hash>` in base64. Uses Node's own crypto, so there is no native module to build. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const [scheme, salt, hash] = (stored ?? '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) {
    // Do the same work anyway, so a missing account is not faster to reject than a wrong password.
    await derive(password, Buffer.alloc(16));
    return false;
  }
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
