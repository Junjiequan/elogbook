import { bold, bullets, doc, h, italic, numbered, p, table, tasks } from './content-builders.js';
import { LOCAL_CONTACT, PRINCIPAL_INVESTIGATOR, TEAM } from './demo-people.js';
import type { LogbookSpec } from './demo-spec.js';

/**
 * Fifteen more dummy logbooks across instruments, roles and kinds of access, so a person's list has 30 in all:
 * enough to need paging, filtering and searching. Illustrative content only.
 */
export const FACILITY_SPECS: LogbookSpec[] = [
  {
    slug: 'loki-alignment',
    title: 'LoKI – detector alignment and beam centre checks',
    description: 'Monthly alignment of the three detector banks and a check of the beam centre.',
    instrument: 'LoKI',
    proposalId: null,
    visibility: 'private',
    role: 'owner',
    members: [{ user: LOCAL_CONTACT, role: 'editor' }],
    daysAgo: 6,
    entries: [
      {
        title: 'Beam centre after the shutdown',
        daysAgo: 6,
        at: [9, 20],
        by: 'user',
        content: () =>
          doc(
            h(2, 'Result'),
            p('The beam centre moved by ', bold('0.8 mm'), ' towards the top after the shutdown.'),
            table(
              ['Bank', 'Offset x (mm)', 'Offset y (mm)'],
              [
                ['Rear', '0.1', '0.8'],
                ['Middle', '0.0', '0.7'],
                ['Front', '-0.1', '0.9'],
              ],
            ),
          ),
      },
      {
        title: 'Detector tubes: dead channels',
        daysAgo: 20,
        at: [14, 5],
        by: 'owner',
        content: () =>
          doc(p('Three dead tubes in the front bank were replaced; counts are flat again.')),
      },
    ],
  },
  {
    slug: 'odin-detector-test',
    title: 'ODIN – new imaging detector acceptance test',
    description:
      'Acceptance test of the new sCMOS imaging detector: dark current, linearity, spatial resolution and readout speed.',
    instrument: 'ODIN',
    proposalId: null,
    visibility: 'private',
    role: 'editor',
    owner: TEAM.tomasz,
    members: [{ user: TEAM.priya, role: 'editor' }],
    daysAgo: 9,
    entries: [
      {
        title: 'Dark current and linearity',
        daysAgo: 9,
        at: [11, 40],
        by: 'owner',
        content: () =>
          doc(
            bullets(
              'Dark current below 0.4 e-/px/s at 20 °C',
              'Linear within 1 % up to 80 % of full well',
            ),
            tasks(
              ['Resolution target: edge spread', false],
              ['Readout speed at full frame', false],
            ),
          ),
      },
    ],
  },
  {
    slug: 'dream-sample-env',
    title: 'DREAM – sample environment: cryofurnace',
    description:
      'Commissioning of the cryofurnace between 4 K and 800 K, with temperature stability checks.',
    instrument: 'DREAM',
    proposalId: '2026-0455',
    visibility: 'private',
    role: 'viewer',
    owner: TEAM.elena,
    members: [{ user: TEAM.kenji, role: 'editor' }],
    daysAgo: 12,
    entries: [
      {
        title: 'Cooldown to 4 K',
        daysAgo: 12,
        at: [8, 45],
        by: 'owner',
        content: () =>
          doc(
            p(
              'Cooldown took ',
              bold('3 h 10 min'),
              ' from room temperature; base temperature stable within 20 mK.',
            ),
          ),
      },
      {
        title: 'Ramp to 800 K',
        daysAgo: 11,
        at: [13, 15],
        by: 'owner',
        content: () =>
          doc(p('Ramp at 10 K/min, no overshoot above 3 K. Thermocouple drift is negligible.')),
      },
    ],
  },
  {
    slug: 'cspec-chopper',
    title: 'CSPEC – chopper phasing',
    description:
      'Phasing of the pulse-shaping and frame-overlap choppers against the source pulse.',
    instrument: 'CSPEC',
    proposalId: null,
    visibility: 'facility-read',
    role: 'owner',
    daysAgo: 15,
    entries: [
      {
        title: 'Phase scan',
        daysAgo: 15,
        at: [10, 30],
        by: 'user',
        content: () =>
          doc(
            p(
              'Scanned the phase of chopper 2 in 0.1° steps; the optimum is at ',
              bold('37.4°'),
              '.',
            ),
            numbered('Set the nominal phase', 'Scan ±2° around it', 'Fit the transmission peak'),
          ),
      },
    ],
  },
  {
    slug: 'bifrost-analyser',
    title: 'BIFROST – analyser crystals',
    description: 'Mounting and alignment of the analyser crystals of the nine analyser arcs.',
    instrument: 'BIFROST',
    proposalId: null,
    visibility: 'private',
    role: 'editor',
    owner: PRINCIPAL_INVESTIGATOR,
    daysAgo: 21,
    entries: [
      {
        title: 'Arc 3 and 4',
        daysAgo: 21,
        at: [15, 0],
        by: 'owner',
        content: () =>
          doc(p('Both arcs mounted. Reflectivity measured with a vanadium reference.')),
      },
      {
        title: 'Open questions',
        daysAgo: 18,
        at: [9, 10],
        by: 'user',
        content: () => doc(bullets('Mosaicity of crystal 11', 'Shielding between arcs 5 and 6')),
      },
    ],
  },
  {
    slug: 'freia-magnet',
    title: 'FREIA – vertical field magnet',
    description: 'Commissioning of the 2 T vertical field magnet for polarised reflectometry.',
    instrument: 'FREIA',
    proposalId: '2026-0266',
    visibility: 'private',
    role: 'owner',
    members: [
      { user: TEAM.lars, role: 'editor' },
      { user: TEAM.chloe, role: 'viewer' },
    ],
    daysAgo: 25,
    entries: [
      {
        title: 'Field map',
        daysAgo: 25,
        at: [12, 0],
        by: 'user',
        content: () =>
          doc(
            p('Field homogeneity over the sample position is ', bold('±0.6 %'), ' at 2 T.'),
            tasks(['Repeat at 1 T', true], ['Check the stray field at the detector', false]),
          ),
      },
    ],
  },
  {
    slug: 'skadi-calibration',
    title: 'SKADI – q-range calibration',
    description: 'Calibration of the q-range with silver behenate and a latex standard.',
    instrument: 'SKADI',
    proposalId: null,
    visibility: 'private',
    role: 'viewer',
    owner: TEAM.amara,
    daysAgo: 30,
    entries: [
      {
        title: 'Silver behenate',
        daysAgo: 30,
        at: [9, 55],
        by: 'owner',
        content: () => doc(p('First order peak at q = ', bold('0.1076 Å⁻¹'), ', as expected.')),
      },
    ],
  },
  {
    slug: 'estia-mirror',
    title: 'ESTIA – focusing mirror alignment',
    description: 'Alignment of the elliptical focusing guide and measurement of the focal spot.',
    instrument: 'ESTIA',
    proposalId: null,
    visibility: 'private',
    role: 'owner',
    members: [{ user: TEAM.diego, role: 'editor' }],
    daysAgo: 35,
    entries: [
      {
        title: 'Focal spot',
        daysAgo: 35,
        at: [16, 20],
        by: 'user',
        content: () =>
          doc(
            h(3, 'Measured'),
            p('Spot size ', italic('0.4 × 4 mm'), ' (FWHM) at the sample position.'),
            bullets('Intensity gain 6.8 compared with the unfocused guide'),
          ),
      },
    ],
  },
  {
    slug: 'nmx-crystal',
    title: 'NMX – crystal mounting procedure',
    description: 'A step-by-step procedure for mounting and cryo-cooling protein crystals.',
    instrument: 'NMX',
    proposalId: null,
    visibility: 'facility-read',
    role: 'editor',
    owner: LOCAL_CONTACT,
    members: [{ user: TEAM.tomasz, role: 'editor' }],
    daysAgo: 45,
    entries: [
      {
        title: 'Procedure v3',
        daysAgo: 45,
        at: [10, 0],
        by: 'owner',
        content: () =>
          doc(
            numbered(
              'Fish the crystal from the drop',
              'Transfer it to the cryoprotectant for 10 seconds',
              'Mount on the goniometer pin and plunge into liquid nitrogen',
            ),
          ),
      },
    ],
  },
  {
    slug: 'safety-induction',
    title: 'Safety induction checklist – new users',
    description: 'Checklist for the induction of new users at the instruments.',
    instrument: null,
    proposalId: null,
    visibility: 'private',
    role: 'owner',
    members: [
      { user: LOCAL_CONTACT, role: 'editor' },
      { user: TEAM.chloe, role: 'viewer' },
    ],
    daysAgo: 60,
    entries: [
      {
        title: 'Induction – autumn',
        daysAgo: 60,
        at: [8, 30],
        by: 'user',
        content: () =>
          doc(
            tasks(
              ['Site access badge issued', true],
              ['Radiation safety briefing', true],
              ['Instrument-specific training', false],
            ),
          ),
      },
    ],
  },
  {
    slug: 'loki-standards',
    title: 'LoKI – standard samples and reference measurements',
    description:
      'Reference measurements used to check the instrument every cycle: a polymer latex, a porous silica and the empty beam.',
    instrument: 'LoKI',
    proposalId: null,
    visibility: 'facility-read',
    role: 'editor',
    owner: LOCAL_CONTACT,
    members: [{ user: TEAM.priya, role: 'editor' }],
    daysAgo: 5,
    entries: [
      {
        title: 'Cycle 2026-3 reference set',
        daysAgo: 5,
        at: [8, 15],
        by: 'owner',
        content: () =>
          doc(
            table(
              ['Sample', 'Time (min)', 'Result'],
              [
                ['Latex 100 nm', '20', 'Radius 49.6 nm'],
                ['Porous silica', '30', 'Peak at 0.052 Å⁻¹'],
                ['Empty beam', '10', 'Flat'],
              ],
            ),
          ),
      },
    ],
  },
  {
    slug: 'dream-powder-reference',
    title: 'DREAM – powder reference: Si and Na₂Ca₃Al₂F₁₄',
    description:
      'Resolution function from the standard powders, for the Rietveld refinements of all later proposals.',
    instrument: 'DREAM',
    proposalId: null,
    visibility: 'private',
    role: 'viewer',
    owner: TEAM.kenji,
    members: [{ user: TEAM.elena, role: 'editor' }],
    daysAgo: 14,
    entries: [
      {
        title: 'Silicon, high resolution mode',
        daysAgo: 14,
        at: [10, 45],
        by: 'owner',
        content: () => doc(p('Δd/d = ', bold('0.0014'), ' at 1.0 Å in the backscattering bank.')),
      },
      {
        title: 'Na₂Ca₃Al₂F₁₄ for the profile shape',
        daysAgo: 13,
        at: [11, 30],
        by: 'owner',
        content: () =>
          doc(
            bullets(
              'Peak shape fitted with a pseudo-Voigt',
              'Parameters stored with the calibration',
            ),
          ),
      },
    ],
  },
  {
    slug: 'odin-tomography',
    title: 'ODIN – tomographic reconstruction pipeline',
    description:
      'Notes on the reconstruction of neutron tomography data: normalisation, centre of rotation and ring removal.',
    instrument: 'ODIN',
    proposalId: null,
    visibility: 'private',
    role: 'owner',
    members: [
      { user: TEAM.tomasz, role: 'editor' },
      { user: TEAM.amara, role: 'viewer' },
    ],
    daysAgo: 8,
    entries: [
      {
        title: 'Centre of rotation',
        daysAgo: 8,
        at: [14, 25],
        by: 'user',
        content: () =>
          doc(
            numbered(
              'Reconstruct slices at three centre offsets',
              'Pick the one without arcs',
              'Check on the opposite projections',
            ),
          ),
      },
      {
        title: 'Ring removal filters compared',
        daysAgo: 16,
        at: [9, 5],
        by: 'owner',
        content: () =>
          doc(
            p('The wavelet filter keeps edges better than the median filter at the same strength.'),
          ),
      },
    ],
  },
  {
    slug: 'cspec-background',
    title: 'CSPEC – background and shielding measurements',
    description:
      'Measurements of the instrument background with the beam on and off, and the effect of the new shielding.',
    instrument: 'CSPEC',
    proposalId: null,
    visibility: 'private',
    role: 'owner',
    daysAgo: 28,
    entries: [
      {
        title: 'Before and after the shielding',
        daysAgo: 28,
        at: [15, 40],
        by: 'user',
        content: () =>
          doc(
            table(
              ['Condition', 'Counts / h'],
              [
                ['Beam off, old shielding', '310'],
                ['Beam off, new shielding', '120'],
              ],
            ),
          ),
      },
    ],
  },
  {
    slug: 'journal-club',
    title: 'Journal club – papers and discussion notes',
    description:
      'Papers we read together, with a few lines of discussion on each. Open to the whole facility.',
    instrument: null,
    proposalId: null,
    visibility: 'facility-read',
    role: 'owner',
    members: [
      { user: LOCAL_CONTACT, role: 'editor' },
      { user: TEAM.priya, role: 'editor' },
      { user: TEAM.lars, role: 'editor' },
      { user: TEAM.diego, role: 'viewer' },
    ],
    daysAgo: 11,
    entries: [
      {
        title: 'Autumn: contrast variation in SANS',
        daysAgo: 11,
        at: [16, 0],
        by: 'user',
        content: () =>
          doc(
            h(3, 'Discussion'),
            bullets(
              'Is the match point stable with temperature?',
              'How much deuteration is enough for the scaffold?',
            ),
            tasks(['Share the slides', true], ['Pick the next paper', false]),
          ),
      },
    ],
  },
];
