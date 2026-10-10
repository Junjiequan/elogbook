import { InjectionToken } from '@angular/core';

/**
 * TEST-ONLY AUTH — delete the whole `features/test-auth` folder to remove it (see README).
 *
 * Google OAuth *web client ID* (public, safe to commit). Leave empty to hide the Google button.
 * Create one at https://console.cloud.google.com/apis/credentials → "OAuth client ID" → "Web application"
 * and add these under "Authorized JavaScript origins":
 *   http://localhost:4300
 *   https://junjiequan.github.io
 */
export const GOOGLE_CLIENT_ID_VALUE =
  '980931567204-m5o4s4ujc8p142tnet35gjooidl2jb4u.apps.googleusercontent.com';

export const GOOGLE_CLIENT_ID = new InjectionToken<string>('GOOGLE_CLIENT_ID', {
  factory: () => GOOGLE_CLIENT_ID_VALUE,
});

/** Password of the three seeded demo accounts. */
export const DEMO_PASSWORD = 'demo1234';

/**
 * Emails that count as administrators in this test sign-in (they may delete any logbook they can open).
 * Add your own address here to try the admin features.
 */
export const ADMIN_EMAILS: readonly string[] = ['anna.lindqvist@example.org'];
