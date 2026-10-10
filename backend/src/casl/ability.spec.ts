import { defineAbilityFor, entrySubject, logbookSubject, roleOf } from './ability.js';
import type { LogbookLike } from './types.js';

const logbook = (over: Partial<LogbookLike> = {}): LogbookLike => ({
  visibility: 'private',
  members: [
    { userId: 'owner', role: 'owner' },
    { userId: 'editor', role: 'editor' },
    { userId: 'viewer', role: 'viewer' },
  ],
  ...over,
});

const person = (id: string, isAdmin = false) => defineAbilityFor({ id, isAdmin });

describe('permissions', () => {
  describe('on a private logbook', () => {
    const subject = logbookSubject(logbook());

    it.each([
      ['owner', { read: true, write: true, configure: true, delete: true }],
      ['editor', { read: true, write: true, configure: false, delete: false }],
      ['viewer', { read: true, write: false, configure: false, delete: false }],
      ['stranger', { read: false, write: false, configure: false, delete: false }],
    ])('%s', (id, expected) => {
      const ability = person(id);
      for (const [action, allowed] of Object.entries(expected)) {
        expect(ability.can(action as 'read', subject)).toBe(allowed);
      }
    });
  });

  describe('on a logbook open to the facility', () => {
    const subject = logbookSubject(logbook({ visibility: 'facility-read' }));

    it('lets anyone read it, and nobody but its members change it', () => {
      expect(person('stranger').can('read', subject)).toBe(true);
      expect(person('stranger').can('write', subject)).toBe(false);
      expect(person('stranger').can('configure', subject)).toBe(false);
      expect(person('editor').can('write', subject)).toBe(true);
    });

    it('does not apply to a demo logbook, which is personal', () => {
      const demo = logbookSubject(logbook({ visibility: 'facility-read', demo: true }));
      expect(person('stranger').can('read', demo)).toBe(false);
      expect(person('viewer').can('read', demo)).toBe(true);
    });
  });

  describe('administrators', () => {
    it('may delete what they can open, but cannot open everything', () => {
      const admin = person('admin', true);
      expect(admin.can('delete', logbookSubject(logbook({ visibility: 'facility-read' })))).toBe(
        true,
      );
      expect(admin.can('delete', logbookSubject(logbook()))).toBe(false);
      expect(admin.can('read', logbookSubject(logbook()))).toBe(false);
    });

    it('may delete a logbook they are a plain viewer of', () => {
      const subject = logbookSubject(logbook({ members: [{ userId: 'admin', role: 'viewer' }] }));
      expect(person('admin', true).can('delete', subject)).toBe(true);
      expect(person('admin', false).can('delete', subject)).toBe(false);
    });
  });

  describe('entries', () => {
    it('follow the logbook they are in', () => {
      const entry = entrySubject(logbook());
      expect(person('viewer').can('read', entry)).toBe(true);
      expect(person('viewer').can('write', entry)).toBe(false);
      expect(person('editor').can('write', entry)).toBe(true);
      expect(person('editor').can('delete', entry)).toBe(false);
      expect(person('owner').can('delete', entry)).toBe(true);
      expect(person('stranger').can('read', entry)).toBe(false);
    });

    it('are readable by everyone when their logbook is open to the facility', () => {
      expect(
        person('stranger').can('read', entrySubject(logbook({ visibility: 'facility-read' }))),
      ).toBe(true);
    });
  });

  it('lets anyone signed in start a logbook', () => {
    expect(person('anyone').can('create', 'Logbook')).toBe(true);
  });

  it('accepts members as the app holds them (user.id) as well as the API (userId)', () => {
    const fromApp: LogbookLike = {
      visibility: 'private',
      members: [{ user: { id: 'ana' }, role: 'owner' }],
    };
    expect(person('ana').can('configure', logbookSubject(fromApp))).toBe(true);
    expect(person('bob').can('read', logbookSubject(fromApp))).toBe(false);
  });

  describe('roleOf', () => {
    it('is the member role, or viewer when only the facility rule lets them read', () => {
      expect(roleOf(logbook(), 'editor')).toBe('editor');
      expect(roleOf(logbook(), 'stranger')).toBeNull();
      expect(roleOf(logbook({ visibility: 'facility-read' }), 'stranger')).toBe('viewer');
      expect(roleOf(logbook({ visibility: 'facility-read', demo: true }), 'stranger')).toBeNull();
    });
  });
});
