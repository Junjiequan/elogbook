import { Injectable } from '@angular/core';

/** A provider's own sign-in component, as the API describes it. */
export interface OAuthWidget {
  kind: 'google';
  clientId: string;
}

export interface OAuthProvider {
  label: string;
  /** `null`: the provider has no component of its own, so the redirect button is used. */
  widget: OAuthWidget | null;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (r: { credential: string }) => void;
      }): void;
      renderButton(host: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';
let googleScript: Promise<GoogleIdentity> | undefined;

const googleApi = () => (window as unknown as { google?: GoogleIdentity }).google;

/** Loads Google's script once. */
function loadGoogle(): Promise<GoogleIdentity> {
  const ready = googleApi();
  if (ready?.accounts?.id) {
    return Promise.resolve(ready);
  }
  googleScript ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.onload = () => {
      const loaded = googleApi();
      if (loaded) {
        resolve(loaded);
      } else {
        reject(new Error('Google sign-in did not load'));
      }
    };
    script.onerror = () => reject(new Error('Google sign-in could not be loaded'));
    document.head.append(script);
  }).catch((error: unknown) => {
    googleScript = undefined; // try again next time
    throw error;
  });
  return googleScript;
}

/**
 * Draws each identity provider's own sign-in component (Google's button, ...). A provider without one is not
 * here: the login page shows the redirect button instead. A class so tests can stand in for it.
 */
@Injectable({ providedIn: 'root' })
export class OAuthWidgets {
  /** Draws the component into `host`; `onCredential` gets the ID token when the person has signed in. */
  async render(
    widget: OAuthWidget,
    host: HTMLElement,
    onCredential: (credential: string) => void,
  ): Promise<void> {
    switch (widget.kind) {
      case 'google': {
        const google = await loadGoogle();
        google.accounts.id.initialize({
          client_id: widget.clientId,
          callback: (response) => onCredential(response.credential),
        });
        google.accounts.id.renderButton(host, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(Math.max(host.clientWidth, 200), 400),
        });
        return;
      }
    }
  }
}
