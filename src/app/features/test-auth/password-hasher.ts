const ITERATIONS = 100_000;

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string): Uint8Array =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

export function newSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

/** PBKDF2-SHA256 via WebCrypto. Better than plain text, but this is still only test-grade storage. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: fromBase64(salt) as BufferSource,
      iterations: ITERATIONS,
    },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}
