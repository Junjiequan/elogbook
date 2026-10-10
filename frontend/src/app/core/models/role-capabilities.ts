import type { MemberRole } from './logbook.models';

export interface RoleCapabilities {
  /** How the role is named in a heading. */
  label: string;
  /** How it is named where a person chooses it ("Can edit"). */
  menuLabel: string;
  /** One sentence. */
  summary: string;
  can: string[];
  cannot: string[];
}

/**
 * What each role may and may not do, in words. The API enforces it (`backend/src/casl/ability.ts`) and
 * the README has the same table; this is the one place the app takes its wording from, for the hover
 * card on a role tag and for the legend in the share dialog.
 */
export const ROLE_CAPABILITIES: Record<MemberRole, RoleCapabilities> = {
  viewer: {
    label: 'Viewer',
    menuLabel: 'Can view',
    summary: 'Read entries and their history, export and print. Cannot change anything.',
    can: [
      'Open the logbook and read its entries',
      'See the version history of an entry',
      'Export and print',
      'Pin entries (pins are personal)',
    ],
    cannot: [
      'Add or edit entries',
      'Save or restore versions',
      'Delete entries or the logbook',
      'Change the title, or who has access',
    ],
  },
  editor: {
    label: 'Editor',
    menuLabel: 'Can edit',
    summary: 'Add and edit entries, save and restore versions.',
    can: ['Everything a viewer can do', 'Add and edit entries', 'Save and restore versions'],
    cannot: ['Delete entries or the logbook', 'Change the title, or who has access'],
  },
  owner: {
    label: 'Owner',
    menuLabel: 'Owner',
    summary: 'Everything: also delete entries and the logbook, and change who has access.',
    can: [
      'Everything an editor can do',
      'Delete entries and the logbook',
      'Change the title and description',
      'Change who has access, and hand the logbook over',
    ],
    cannot: [],
  },
};
