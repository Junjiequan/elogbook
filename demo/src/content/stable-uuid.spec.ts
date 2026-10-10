import { stableUuid } from './stable-uuid.js';

describe('stableUuid', () => {
  it('gives the same UUID for the same text, and different ones for different text', () => {
    expect(stableUuid('a')).toBe(stableUuid('a'));
    expect(stableUuid('a')).not.toBe(stableUuid('b'));
  });

  it('is a valid UUID that PostgreSQL accepts', () => {
    expect(stableUuid('anything')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
