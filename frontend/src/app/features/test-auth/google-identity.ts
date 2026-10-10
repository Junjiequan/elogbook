/** Minimal wrapper around Google Identity Services ("Sign in with Google"). */

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';
let loading: Promise<GoogleAccountsId> | undefined;

export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  loading ??= new Promise((resolve, reject) => {
    const existing = (window as unknown as { google?: { accounts?: { id?: GoogleAccountsId } } })
      .google;
    if (existing?.accounts?.id) {
      resolve(existing.accounts.id);
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const id = (window as unknown as { google?: { accounts?: { id?: GoogleAccountsId } } }).google
        ?.accounts?.id;
      return id ? resolve(id) : reject(new Error('Google Identity Services did not initialise'));
    };
    script.onerror = () => {
      loading = undefined; // allow a retry
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.append(script);
  });
  return loading;
}

export async function renderGoogleButton(
  element: HTMLElement,
  clientId: string,
  onCredential: (jwt: string) => void,
): Promise<void> {
  const google = await loadGoogleIdentity();
  google.initialize({
    client_id: clientId,
    callback: (response) => onCredential(response.credential),
  });
  google.renderButton(element, {
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    width: 320,
  });
}

export interface GoogleProfile {
  email: string;
  name: string;
}

/**
 * Reads the profile out of a Google ID token and checks audience, issuer, expiry and verified email.
 *
 * NOTE: the signature is NOT verified (that needs a server). Anyone can forge a token in their own
 * browser, which is acceptable for local testing and exactly why this must be replaced by a real
 * backend-verified login before any real use.
 */
export function decodeGoogleCredential(
  jwt: string,
  clientId: string,
  nowMs = Date.now(),
): GoogleProfile {
  let payload: Record<string, unknown>;
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(part), (c) => c.charCodeAt(0));
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('Invalid Google credential');
  }
  const issuerOk =
    payload['iss'] === 'accounts.google.com' || payload['iss'] === 'https://accounts.google.com';
  if (!issuerOk || payload['aud'] !== clientId) {
    throw new Error('Google credential was not issued for this app');
  }
  if (typeof payload['exp'] !== 'number' || payload['exp'] * 1000 <= nowMs) {
    throw new Error('Google credential has expired');
  }
  if (typeof payload['email'] !== 'string' || payload['email_verified'] !== true) {
    throw new Error('Your Google email address is not verified');
  }
  return {
    email: payload['email'],
    name: typeof payload['name'] === 'string' ? payload['name'] : payload['email'],
  };
}
