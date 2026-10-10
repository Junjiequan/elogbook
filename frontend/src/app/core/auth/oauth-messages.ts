/** Why an OAuth sign-in failed, in words. The API sends the codes. */
export const OAUTH_MESSAGES: Record<string, string> = {
  denied: 'Sign-in was cancelled.',
  expired: 'That sign-in took too long. Try again.',
  failed: 'Signing in did not work. Try again.',
  unverified: 'Your email address is not verified with the provider, so it cannot be used here.',
  conflict: 'This email address is already linked to a different account at the provider.',
  not_allowed: 'Accounts with this email address are not allowed to sign in here.',
  no_account: 'There is no account for this email address yet. Ask for access first.',
  unavailable: 'The sign-in service cannot be reached right now. Try again in a moment.',
};

export const oauthMessage = (code: string | null | undefined): string =>
  OAUTH_MESSAGES[code ?? ''] ?? OAUTH_MESSAGES['failed'];
