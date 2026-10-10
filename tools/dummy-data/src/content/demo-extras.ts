import type { Entry, Logbook, LogbookBundle, User } from './demo.types.js';
import {
  bold,
  bullets,
  doc,
  h,
  highlight,
  italic,
  numbered,
  p,
  quote,
  table,
  tasks,
} from './content-builders.js';
import {
  demoLogbookId,
  later,
  LOCAL_CONTACT,
  moment,
  PRINCIPAL_INVESTIGATOR,
  REMOTE_COLLEAGUE,
  TEAM,
} from './demo-people.js';
import { MORE_SPECS } from './demo-more.js';
import type { LogbookSpec } from './demo-spec.js';

/**
 * Smaller demo logbooks that fill the list with a realistic spread: different instruments,
 * roles (owner / editor / viewer) and access levels. Illustrative content only.
 */
const SPECS: LogbookSpec[] = [
  {
    slug: 'estia-pd',
    title: 'ESTIA – Pd thin film hydrogen uptake',
    description: 'In-situ neutron reflectometry of a 50 nm Pd film during H₂ loading.',
    instrument: 'ESTIA',
    proposalId: '2026-0377',
    visibility: 'private',
    role: 'owner',
    daysAgo: 6,
    entries: [
      {
        title: 'Sample alignment on the reflectometer',
        daysAgo: 6,
        at: [9, 10],
        by: 'user',
        content: () =>
          doc(
            h(2, 'Alignment'),
            p(
              'Pd film (50 nm) on a 100 mm Si wafer, mounted in the gas cell. Reflected beam found after the second z-scan.',
            ),
            numbered(
              'z-scan with the detector at 2θ = 0: sample edge at z = −0.35 mm.',
              'ω-scan at 2θ = 1.2°: peak at ω = 0.60° (offset 0.003°).',
              'Rocking curve FWHM 0.018°, in line with a flat wafer.',
            ),
            tasks(
              ['Gas cell leak test with He (< 1×10⁻⁸ mbar·l/s)', true],
              ['Hydrogen line purged three times', true],
              ['Safety officer sign-off for H₂ in the hall', true],
            ),
          ),
      },
      {
        title: 'In-situ H₂ loading – first isotherm points',
        daysAgo: 5,
        at: [14, 25],
        by: 'user',
        content: () =>
          doc(
            h(2, 'Loading steps'),
            table(
              [
                'Step',
                'H₂ pressure (mbar)',
                'Time at pressure (min)',
                'Critical edge shift (mdeg)',
                'Comment',
              ],
              [
                ['1', '0 (vacuum)', '30', '0', 'Reference'],
                ['2', '10', '25', '+0.4', ''],
                ['3', '50', '25', '+1.1', ''],
                ['4', '100', '30', '+2.6', 'Film thickness grows ~1.5 nm'],
                ['5', '200', '40', '+5.2', highlight('Plateau region starts')],
                ['6', '500', '40', '+5.9', 'Nearly saturated'],
              ],
            ),
            h(3, 'Observations'),
            bullets(
              'The critical edge moves to larger angle as hydrogen is absorbed, consistent with the changing scattering length density.',
              'Fringes (Kiessig) shift by about 3 % in Q between 100 and 500 mbar, so the film swells.',
              [
                bold('Pressure gauge reading was unstable at step 3'),
                '; reran for 5 minutes and it settled.',
              ],
            ),
          ),
      },
    ],
  },
  {
    slug: 'dream-nmc',
    title: 'DREAM – NMC811 cathode degradation',
    description:
      'Powder diffraction on pristine and cycled NMC811 cathode material. Led by Henrik Larsen.\n\nThe goal is to follow the loss of lithium and the growth of the rock-salt surface layer as a function of cycle number. Samples: pristine, 100, 250 and 500 cycles, each measured in a 3 mm vanadium capillary at room temperature and, for the 500-cycle sample, up to 600 K to see the thermal decomposition. Refinements are done with a two-phase model (layered R-3m and rock-salt Fm-3m); the working notes, the refined structures and the plots of lattice parameters against cycle number are collected in the entries below.',
    instrument: 'DREAM',
    proposalId: '2026-0290',
    visibility: 'private',
    role: 'editor',
    owner: PRINCIPAL_INVESTIGATOR,
    members: [
      { user: TEAM.priya, role: 'editor' },
      { user: TEAM.tomasz, role: 'editor' },
      { user: TEAM.elena, role: 'viewer' },
      { user: TEAM.kenji, role: 'viewer' },
      { user: TEAM.amara, role: 'viewer' },
    ],
    daysAgo: 12,
    entries: [
      {
        title: 'Pristine vs 500 cycles – first look',
        daysAgo: 12,
        at: [11, 5],
        by: 'owner',
        content: () =>
          doc(
            h(2, 'Refined lattice parameters (Rietveld, R-3m)'),
            table(
              ['Sample', 'a (Å)', 'c (Å)', 'c/a', 'Li/Ni mixing (%)'],
              [
                ['NMC811 pristine (S-0207)', '2.8703', '14.2095', '4.951', '1.8'],
                ['NMC811 after 500 cycles (S-0208)', '2.8741', '14.2860', '4.970', '3.9'],
              ],
            ),
            bullets(
              'The c axis expands by 0.54 % after cycling, while a barely changes.',
              'Li/Ni mixing doubles, which matches the capacity loss reported in the electrochemistry.',
              [
                highlight(
                  'Check the anisotropic peak broadening before trusting the mixing number.',
                ),
              ],
            ),
            quote(
              p(
                'Please keep the refinement templates in the shared folder, so we can rerun every sample the same way. — ',
                PRINCIPAL_INVESTIGATOR.name,
              ),
            ),
          ),
      },
      {
        title: 'Capillary and sample holder preparation',
        daysAgo: 13,
        at: [15, 40],
        by: 'user',
        content: () =>
          doc(
            h(2, 'Preparation'),
            p(
              'Both powders were loaded into 6 mm vanadium cans inside the glovebox, and sealed with indium wire.',
            ),
            tasks(
              ['Cans baked and weighed empty', true],
              ['Powder masses recorded (S-0207: 1.82 g, S-0208: 1.76 g)', true],
              ['Cans leak-checked outside the glovebox', true],
              ['Labels photographed for the logbook', false],
            ),
          ),
      },
    ],
  },
  {
    slug: 'bifrost-commissioning',
    title: 'BIFROST – detector commissioning notes',
    description:
      'Shared, read-only notes from the analyser commissioning. Maintained by the instrument team.\n\nContents: analyser calibration for each triplet, chopper phasing logs, vanadium and elastic-line checks, the list of known dead pixels, and the open issues with the data acquisition. Please do not edit; send corrections to the local contact.',
    instrument: 'BIFROST',
    proposalId: null,
    visibility: 'facility-read',
    role: 'viewer',
    owner: LOCAL_CONTACT,
    members: [
      { user: TEAM.lars, role: 'editor' },
      { user: TEAM.chloe, role: 'viewer' },
      { user: TEAM.diego, role: 'viewer' },
    ],
    daysAgo: 20,
    entries: [
      {
        title: 'Analyser calibration, triplet 3',
        daysAgo: 20,
        at: [10, 0],
        by: 'owner',
        content: () =>
          doc(
            h(2, 'Calibration status'),
            table(
              ['Analyser', 'Final energy (meV)', 'Angle offset (°)', 'Status'],
              [
                ['A1', '2.7', '+0.03', 'Calibrated'],
                ['A2', '2.7', '−0.01', 'Calibrated'],
                ['A3', '5.0', '+0.12', 'Needs repeat'],
                ['A4', '5.0', '+0.02', 'Calibrated'],
              ],
            ),
            tasks(
              ['Vanadium run for each analyser', true],
              ['Repeat A3 after realignment', false],
              ['Archive calibration files with the run numbers', false],
            ),
          ),
      },
      {
        title: 'Chopper phasing log',
        daysAgo: 21,
        at: [16, 30],
        by: 'owner',
        content: () =>
          doc(
            h(2, 'Phasing'),
            p(
              'Phases were scanned in 0.1 ms steps and the best setting chosen from the elastic line width.',
            ),
            table(
              ['Chopper', 'Speed (Hz)', 'Phase (ms)', 'Note'],
              [
                ['Pulse-shaping 1', '14', '1.32', ''],
                ['Pulse-shaping 2', '14', '1.37', 'Re-phased after the trip'],
                ['Frame overlap', '14', '4.05', ''],
              ],
            ),
          ),
      },
    ],
  },
  {
    slug: 'skadi-lysozyme',
    title: 'SKADI – protein solution series',
    description: 'Lysozyme in buffer, concentration and temperature scans.',
    instrument: 'SKADI',
    proposalId: '2026-0455',
    visibility: 'private',
    role: 'owner',
    daysAgo: 31,
    entries: [
      {
        title: 'Lysozyme concentration series',
        daysAgo: 31,
        at: [9, 45],
        by: 'user',
        content: () =>
          doc(
            h(2, 'Samples'),
            table(
              ['Concentration (mg/mL)', 'Buffer', 'Volume (µL)', 'Cell', 'Run'],
              [
                ['1', '50 mM acetate, pD 4.6, D₂O', '300', '1 mm quartz', '0120'],
                ['5', '50 mM acetate, pD 4.6, D₂O', '300', '1 mm quartz', '0121'],
                ['10', '50 mM acetate, pD 4.6, D₂O', '300', '1 mm quartz', '0122'],
                ['20', '50 mM acetate, pD 4.6, D₂O', '300', '1 mm quartz', '0123'],
                ['Buffer only', '50 mM acetate, pD 4.6, D₂O', '300', '1 mm quartz', '0124'],
              ],
            ),
            p(
              'Protein was dialysed against the buffer overnight, and the dialysate used for the background measurement.',
            ),
          ),
      },
      {
        title: 'Buffer subtraction and Guinier check',
        daysAgo: 30,
        at: [13, 20],
        by: 'user',
        content: () =>
          doc(
            h(2, 'Analysis steps'),
            numbered(
              'Subtract the dialysate run from each sample, scaled by the volume fraction of protein.',
              'Guinier fit in the range Q·Rg < 1.3.',
              'Compare Rg across concentrations.',
            ),
            table(
              ['Concentration (mg/mL)', 'Rg (Å)', 'Error (Å)'],
              [
                ['1', '15.2', '0.2'],
                ['5', '15.4', '0.2'],
                ['10', '15.9', '0.2'],
                ['20', '16.8', '0.3'],
              ],
            ),
            p(
              italic(
                'Rg grows with concentration because of interparticle repulsion; extrapolate to zero concentration for the final value.',
              ),
            ),
          ),
      },
    ],
  },
  {
    slug: 'dlab-notebook',
    title: 'D-Lab notebook – buffers and stock solutions',
    description: 'Personal lab notes outside any beamtime: recipes and inventory.',
    instrument: null,
    proposalId: null,
    visibility: 'private',
    role: 'owner',
    daysAgo: 45,
    entries: [
      {
        title: 'Deuterated buffer recipes',
        daysAgo: 45,
        at: [10, 15],
        by: 'user',
        content: () =>
          doc(
            h(2, 'Recipes (per 100 mL, D₂O)'),
            table(
              ['Buffer', 'Components', 'pD', 'Note'],
              [
                [
                  'Acetate 50 mM',
                  '295 mg sodium acetate, 0.2 mL deuterated acetic acid',
                  '4.6',
                  'pD = pH meter reading + 0.4',
                ],
                ['Phosphate 20 mM', '0.28 g NaH₂PO₄, 0.19 g Na₂HPO₄', '7.4', 'Filter 0.22 µm'],
                ['Tris 25 mM', '0.30 g Tris-d11', '8.0', 'Adjust with DCl'],
              ],
            ),
            p(
              'Always correct the pH-meter reading by +0.4 to get pD, and record the temperature of the measurement.',
            ),
          ),
      },
      {
        title: 'Stock solutions inventory',
        daysAgo: 44,
        at: [15, 50],
        by: 'user',
        content: () =>
          doc(
            h(2, 'Inventory'),
            table(
              ['Item', 'Location', 'Prepared', 'Use before'],
              [
                ['SDS stock 10 wt% in D₂O', 'Fridge 2, shelf B', 'last month', 'in 2 months'],
                ['Lysozyme 50 mg/mL', 'Freezer −20 °C, box 3', 'last month', 'in 4 months'],
                [
                  'NaCl 1 M in D₂O',
                  'Cabinet, bottle 4',
                  'two months ago',
                  'no expiry, check for growth',
                ],
              ],
            ),
            tasks(
              ['Reorder deuterated acetic acid', false],
              ['Label the new SDS stock with the batch number', true],
            ),
          ),
      },
    ],
  },
  {
    slug: 'trex-mn3sn',
    title: 'T-REX – Mn₃Sn magnetic excitations',
    description:
      'Inelastic scattering on a Mn₃Sn single crystal. Led by Henrik Larsen. A 4 g crystal is aligned in the (H, H, L) plane and cooled to 1.5 K; constant-energy cuts around the zone centre map the spin-wave dispersion, and temperature scans through the Néel point follow the softening of the gap. Notes from the cooldown, the alignment and the first cuts are below; the reduced data and the fitting scripts are in the shared proposal folder.',
    instrument: 'T-REX',
    proposalId: '2026-0211',
    visibility: 'private',
    role: 'editor',
    owner: PRINCIPAL_INVESTIGATOR,
    members: [
      { user: TEAM.kenji, role: 'editor' },
      { user: TEAM.elena, role: 'editor' },
      { user: TEAM.chloe, role: 'viewer' },
      { user: TEAM.diego, role: 'viewer' },
    ],
    daysAgo: 60,
    entries: [
      {
        title: 'Cryostat cooldown log',
        daysAgo: 60,
        at: [8, 30],
        by: 'owner',
        content: () =>
          doc(
            h(2, 'Cooldown'),
            table(
              ['Time', 'Sample T (K)', 'Cold head T (K)', 'Note'],
              [
                ['08:30', '295', '295', 'Start'],
                ['10:30', '120', '60', ''],
                ['12:45', '40', '12', ''],
                ['14:00', '5.1', '3.8', 'Stable'],
              ],
            ),
            p(
              'Crystal mass 2.3 g, mounted with the (HHL) plane horizontal and aligned by the Laue camera before shipping.',
            ),
          ),
      },
      {
        title: 'First energy cut at the zone centre',
        daysAgo: 59,
        at: [11, 20],
        by: 'user',
        content: () =>
          doc(
            h(2, 'Energy cut'),
            p(
              'Elastic line width 0.18 meV at the zone centre. Dispersive excitation visible up to about 25 meV; ',
              bold('a flat band near 8 meV'),
              ' was not expected.',
            ),
            tasks(
              ['Repeat at 50 K to see whether the flat band survives', false],
              ['Measure the background with the sample rotated away', true],
            ),
          ),
      },
    ],
  },
];

function toBundle(spec: LogbookSpec, user: User, now: Date): LogbookBundle {
  const owner = spec.role === 'owner' ? user : (spec.owner ?? LOCAL_CONTACT);
  const logbookId = demoLogbookId(spec.slug, user);

  const members: Logbook['members'] =
    spec.role === 'owner'
      ? [
          { user, role: 'owner' },
          { user: REMOTE_COLLEAGUE, role: 'viewer' },
        ]
      : [
          { user: owner, role: 'owner' },
          { user, role: spec.role },
        ];
  members.push(...(spec.members ?? []));

  const entries: Entry[] = spec.entries.map((e) => {
    const created = moment(now, e.daysAgo, e.at[0], e.at[1]);
    return {
      id: crypto.randomUUID(),
      logbookId,
      title: e.title,
      content: e.content(),
      revision: 4,
      createdAt: created.toISOString(),
      updatedAt: later(created, 70, now).toISOString(),
      updatedBy: e.by === 'user' ? user : owner,
    };
  });

  const logbook: Logbook = {
    id: logbookId,
    title: spec.title,
    description: spec.description,
    instrument: spec.instrument,
    proposalId: spec.proposalId,
    visibility: spec.visibility,
    members,
    demo: true,
    createdAt: moment(now, spec.daysAgo + 1, 9, 0).toISOString(),
    updatedAt:
      entries
        .map((e) => e.updatedAt)
        .sort()
        .at(-1) ?? now.toISOString(),
  };
  return { logbook, entries, versions: [] };
}

export const createExtraDemoLogbooks = (user: User, now = new Date()): LogbookBundle[] =>
  [...SPECS, ...MORE_SPECS].map((spec) => toBundle(spec, user, now));
