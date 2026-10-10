import { isDemoEnabled, NOT_ENABLED } from './enabled.js';

describe('isDemoEnabled', () => {
  it('is on only for the exact value "true"', () => {
    expect(isDemoEnabled({ ENABLE_DEMO: 'true' })).toBe(true);
  });

  it.each([undefined, '', 'false', 'FALSE', 'TRUE', 'True', '1', 'yes', 'on', ' true', 'true '])(
    'is off for %j',
    (value) => {
      expect(isDemoEnabled({ ENABLE_DEMO: value })).toBe(false);
    },
  );

  it('also accepts the lower-case spelling', () => {
    expect(isDemoEnabled({ enable_demo: 'true' })).toBe(true);
    expect(isDemoEnabled({ enable_demo: 'false' })).toBe(false);
  });

  it('is off when the variable is not there at all', () => {
    expect(isDemoEnabled({})).toBe(false);
  });

  it('tells the person how to turn it on', () => {
    expect(NOT_ENABLED).toContain('ENABLE_DEMO=true');
  });
});
