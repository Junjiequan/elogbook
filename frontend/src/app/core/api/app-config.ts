import { Injectable } from '@angular/core';

/**
 * Settings that belong to the deployment, not to the build: where the API is. They are read from
 * `config.json` next to the app when it starts, so the same build can be pointed at any API.
 * Without that file (or when it cannot be read) the API is taken to be on the same site, at `/api/v1`.
 */
@Injectable({ providedIn: 'root' })
export class AppConfig {
  /** No trailing slash. */
  apiUrl = '/api/v1';

  async load(): Promise<void> {
    try {
      const response = await fetch('config.json', { cache: 'no-store' });
      if (response.ok) {
        const config = (await response.json()) as { apiUrl?: string };
        if (typeof config.apiUrl === 'string' && config.apiUrl.trim()) {
          this.apiUrl = config.apiUrl.trim().replace(/\/+$/, '');
        }
      }
    } catch {
      // keep the default
    }
  }
}
