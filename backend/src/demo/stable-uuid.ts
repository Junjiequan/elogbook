import { createHash } from 'node:crypto';

/** The same text always gives the same UUID, so making the sample logbooks twice cannot duplicate them. */
export function stableUuid(key: string): string {
  const bytes = createHash('sha1').update(`elogbook-demo:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
