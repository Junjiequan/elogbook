import { bold, bullets, doc, h, italic, numbered, p, table, tasks } from './content-builders.js';
import { LOCAL_CONTACT, PRINCIPAL_INVESTIGATOR, TEAM } from './demo-people.js';
import type { LogbookSpec } from './demo-spec.js';

/**
 * More demo logbooks, so the list needs more than one page, with a mix of very long descriptions and
 * many members to show off the hover cards. Illustrative content only.
 */
export const MORE_SPECS: LogbookSpec[] = [
  {
    slug: 'odin-pouch-cell',
    title: 'ODIN – neutron imaging of a Li-ion pouch cell during cycling',
    description:
      'Time-resolved neutron radiography and tomography of a commercial 5 Ah pouch cell during charge and discharge at several C-rates, to follow lithium transport and gas evolution inside the stack.\n\nThe campaign covers three cells (fresh, 200 cycles, 500 cycles), each imaged at 1 C, 2 C and during a 30 minute rest. Radiographs are taken every 20 s with a 12 s exposure; a full tomogram is acquired at the start and end of every step. Reference images of an empty holder and of the electrolyte-only cell are part of each session. Data reduction uses the standard flat-field and dark-field correction, followed by a ring-artefact filter; the processing scripts live in the shared project folder.',
    instrument: 'ODIN',
    proposalId: '2026-0318',
    visibility: 'private',
    role: 'editor',
    owner: TEAM.priya,
    members: [
      { user: TEAM.tomasz, role: 'editor' },
      { user: TEAM.elena, role: 'editor' },
      { user: TEAM.kenji, role: 'viewer' },
      { user: TEAM.amara, role: 'viewer' },
    ],
    daysAgo: 4,
    entries: [
      {
        title: 'Cell mounting and alignment',
        daysAgo: 4,
        at: [10, 15],
        by: 'owner',
        content: () =>
          doc(
            h(2, 'Setup'),
            bullets(
              'Pouch cell clamped between two aluminium plates with 0.3 MPa stack pressure.',
              'Thermocouple taped to the cell surface; cycler connected through the shielded cable.',
              'Detector distance 280 mm, field of view 55 × 55 mm.',
            ),
            tasks(
              ['Beam shutter interlock checked', true],
              ['Dark and flat fields acquired', true],
              ['Tomography rotation axis centred', false],
            ),
          ),
      },
      {
        title: 'First cycle at 1 C',
        daysAgo: 3,
        at: [14, 40],
        by: 'user',
        content: () =>
          doc(
            h(2, 'Observations'),
            p('The anode side darkens steadily during charge, as expected for lithiation.'),
            table(
              ['Step', 'Duration (min)', 'Frames', 'Note'],
              [
                ['Charge 1 C', '60', '180', 'Gas pocket visible near the tab after 40 min'],
                ['Rest', '30', '90', 'Contrast recovers slowly'],
                ['Discharge 1 C', '60', '180', ''],
              ],
            ),
          ),
      },
    ],
  },
  {
    slug: 'cspec-ionic-liquids',
    title: 'CSPEC – quasielastic scattering in ionic liquids',
    description:
      'Dynamics of imidazolium-based ionic liquids on the nanosecond timescale. Shared notes of the instrument team and the external users.',
    instrument: 'CSPEC',
    proposalId: '2026-0502',
    visibility: 'facility-read',
    role: 'viewer',
    owner: TEAM.elena,
    members: [{ user: TEAM.lars, role: 'editor' }],
    daysAgo: 9,
    entries: [
      {
        title: 'Choice of incident wavelength',
        daysAgo: 9,
        at: [11, 0],
        by: 'owner',
        content: () =>
          doc(
            p(
              'We use ',
              bold('6 Å'),
              ' neutrons: the resolution of about 15 µeV is sufficient for the diffusive broadening expected at 350 K.',
            ),
            numbered(
              'Vanadium run for the resolution function.',
              'Empty can.',
              'Sample at 300, 325, 350 K.',
            ),
          ),
      },
    ],
  },
  {
    slug: 'freia-fept',
    title: 'FREIA – magnetic reflectivity of Fe/Pt multilayers under applied field',
    description:
      'Polarised neutron reflectometry on a series of Fe/Pt multilayers with varying Pt thickness (1 to 6 nm) to extract the induced moment in Pt as a function of applied field and temperature.',
    instrument: 'FREIA',
    proposalId: '2026-0266',
    visibility: 'private',
    role: 'owner',
    members: [
      { user: TEAM.kenji, role: 'editor' },
      { user: TEAM.chloe, role: 'editor' },
      { user: TEAM.diego, role: 'viewer' },
      { user: TEAM.priya, role: 'viewer' },
      { user: TEAM.lars, role: 'viewer' },
      { user: PRINCIPAL_INVESTIGATOR, role: 'viewer' },
    ],
    daysAgo: 6,
    entries: [
      {
        title: 'Sample list and magnet calibration',
        daysAgo: 6,
        at: [9, 30],
        by: 'user',
        content: () =>
          doc(
            table(
              ['Sample', 'Pt (nm)', 'Fe (nm)', 'Repeats', 'Substrate'],
              [
                ['FP-1', '1', '3', '10', 'Si (100)'],
                ['FP-2', '2', '3', '10', 'Si (100)'],
                ['FP-4', '4', '3', '10', 'Si (100)'],
                ['FP-6', '6', '3', '10', 'Si (100)'],
              ],
            ),
            p(
              italic(
                'Field calibrated against the Hall probe: 0.5 T gives 498 mT at the sample position.',
              ),
            ),
          ),
      },
      {
        title: 'Polarisation efficiency check',
        daysAgo: 5,
        at: [16, 10],
        by: 'user',
        content: () =>
          doc(
            p(
              'Flipping ratio measured on the direct beam: 28.4 (up) and 26.9 (down), good enough to start.',
            ),
          ),
      },
    ],
  },
  {
    slug: 'nmx-commissioning',
    title: 'NMX – macromolecular crystallography commissioning',
    description:
      'Commissioning notes for the NMX detectors and goniometer. Facility-wide read access so that everyone can follow the progress; only the commissioning team can edit.',
    instrument: 'NMX',
    proposalId: null,
    visibility: 'facility-read',
    role: 'editor',
    owner: LOCAL_CONTACT,
    members: [
      { user: TEAM.tomasz, role: 'editor' },
      { user: TEAM.amara, role: 'editor' },
      { user: TEAM.diego, role: 'viewer' },
    ],
    daysAgo: 14,
    entries: [
      {
        title: 'Detector panel alignment',
        daysAgo: 14,
        at: [13, 5],
        by: 'owner',
        content: () =>
          doc(
            bullets('Panel 1 offset: 0.4 mm', 'Panel 2 offset: 0.1 mm', 'Panel 3 offset: -0.3 mm'),
            p('Offsets will be refined with the lysozyme test crystal next week.'),
          ),
      },
    ],
  },
  {
    slug: 'loki-calibration',
    title: 'LoKI – detector calibration and background runs',
    description: 'Routine calibration of the LoKI detector banks; one entry per calibration day.',
    instrument: 'LoKI',
    proposalId: null,
    visibility: 'private',
    role: 'owner',
    daysAgo: 18,
    entries: [
      {
        title: 'Calibration with the standard sample',
        daysAgo: 18,
        at: [8, 50],
        by: 'user',
        content: () =>
          doc(p('Glassy carbon standard, run 0301: intensity within 2 % of the reference.')),
      },
    ],
  },
  {
    slug: 'dream-furnace',
    title: 'DREAM – sample environment: furnace tests',
    description:
      'Test results for the new high-temperature furnace insert (up to 1600 K): temperature stability, background from the heating element and the shielding.',
    instrument: 'DREAM',
    proposalId: null,
    visibility: 'private',
    role: 'viewer',
    owner: TEAM.tomasz,
    members: [{ user: TEAM.elena, role: 'editor' }],
    daysAgo: 25,
    entries: [
      {
        title: 'Temperature ramp to 1200 K',
        daysAgo: 25,
        at: [15, 20],
        by: 'owner',
        content: () =>
          doc(p('Ramp at 10 K/min; the controller overshoots by 6 K and settles after 8 minutes.')),
      },
    ],
  },
  {
    slug: 'group-meetings',
    title: 'Instrument science group – weekly meeting notes',
    description:
      'Agenda, decisions and action items from the weekly group meeting. Open to the whole group; please add your own items below the agenda before Monday noon.',
    instrument: null,
    proposalId: null,
    visibility: 'facility-read',
    role: 'owner',
    members: [
      { user: LOCAL_CONTACT, role: 'editor' },
      { user: TEAM.priya, role: 'editor' },
      { user: TEAM.tomasz, role: 'editor' },
      { user: TEAM.elena, role: 'editor' },
      { user: TEAM.kenji, role: 'editor' },
      { user: TEAM.amara, role: 'viewer' },
      { user: TEAM.lars, role: 'viewer' },
      { user: TEAM.chloe, role: 'viewer' },
    ],
    daysAgo: 2,
    entries: [
      {
        title: 'Meeting – week 41',
        daysAgo: 2,
        at: [10, 0],
        by: 'user',
        content: () =>
          doc(
            h(2, 'Agenda'),
            numbered('Beamtime schedule', 'Detector spares', 'Training for the new users'),
            h(2, 'Action items'),
            tasks(
              ['Order spare detector tubes', false],
              ['Update the user guide for the sample changer', true],
            ),
          ),
      },
    ],
  },
  {
    slug: 'proposal-drafts',
    title: 'Beamtime proposal drafts – 2026 call',
    description: 'Scratch space for the next call for proposals: ideas, figures and wording.',
    instrument: null,
    proposalId: null,
    visibility: 'private',
    role: 'owner',
    daysAgo: 40,
    entries: [
      {
        title: 'Idea: contrast variation on lipid nanodiscs',
        daysAgo: 40,
        at: [17, 30],
        by: 'user',
        content: () =>
          doc(
            p('Use deuterated and hydrogenated scaffold proteins to match out either component.'),
            bullets('Needs about 2 days on SKADI', 'Sample prep done in-house'),
          ),
      },
    ],
  },
];
