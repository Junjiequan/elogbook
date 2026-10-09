import type { JSONContent } from '@tiptap/core';
import type {
  Entry,
  EntryVersion,
  Logbook,
  LogbookBundle,
  User,
  VersionReason,
} from '../../models/logbook.models';
import {
  bold,
  bullets,
  code,
  codeBlock,
  doc,
  h,
  highlight,
  image,
  italic,
  link,
  numbered,
  p,
  quote,
  rule,
  sampleInfo,
  table,
  tasks,
  type SampleBlock,
} from './content-builders';
import { detectorImage, iqPlot, shearCellSchematic } from './figures';
import { demoLogbookId, later, LOCAL_CONTACT, moment, REMOTE_COLLEAGUE } from './demo-people';

const PROPOSAL = {
  proposalId: '2026-0412',
  proposalTitle: 'Micelle structure under shear',
  instrument: 'LoKI',
};

const SAMPLES: Record<'sds5' | 'sds10' | 'd2o' | 'nacl', SampleBlock> = {
  sds5: { ...PROPOSAL, sampleId: 'S-0031', sampleName: 'SDS 5 wt% in D2O', formula: 'C12H25NaO4S' },
  sds10: {
    ...PROPOSAL,
    sampleId: 'S-0032',
    sampleName: 'SDS 10 wt% in D2O',
    formula: 'C12H25NaO4S',
  },
  d2o: { ...PROPOSAL, sampleId: 'S-0033', sampleName: 'D2O solvent background', formula: 'D2O' },
  nacl: {
    ...PROPOSAL,
    sampleId: 'S-0034',
    sampleName: 'SDS 5 wt% + 100 mM NaCl in D2O',
    formula: 'C12H25NaO4S',
  },
};

// ───────────────────────────── entry contents ─────────────────────────────

function arrivalEntry(owner: User): JSONContent {
  return doc(
    h(2, 'Beamtime overview'),
    p(
      'Proposal ',
      bold('2026-0412'),
      ' – ',
      italic('Micelle structure under shear'),
      '. Three days of beamtime on LoKI, starting 08:00. ',
      'Local contact: ',
      bold(LOCAL_CONTACT.name),
      '. On site: ',
      owner.name,
      '. Remote (analysis): ',
      REMOTE_COLLEAGUE.name,
      '.',
    ),
    table(
      ['Setting', 'Value'],
      [
        ['Instrument', 'LoKI (small-angle neutron scattering)'],
        ['Wavelength band', '3 – 12 Å, time-of-flight'],
        ['Detector banks / distances', 'Rear 5.0 m · Middle 2.5 m · Front 1.1 m'],
        ['Accessible Q range', '0.005 – 0.5 Å⁻¹ (all banks combined)'],
        ['Beam size at sample', '8 mm diameter, circular aperture'],
        ['Sample environment', 'Couette shear cell (1 mm gap) + circulating water bath'],
      ],
    ),
    h(2, 'Before we start'),
    tasks(
      ['Safety induction and instrument briefing with Sofia', true],
      ['Dosimeters collected, lab coats and gloves for D₂O handling', true],
      ['Sample environment delivered and checked against the booking', true],
      ['Remote access to the logbook and data share tested for Marcus', true],
      ['Empty-beam transmission measured', true],
      ['Temperature calibration of the water bath against the sample thermocouple', false],
    ),
    h(2, 'Alignment and first measurement'),
    numbered(
      'Sample stage aligned to the beam with a cadmium pinhole; centre found at x = 0.4 mm, y = −0.2 mm.',
      ['Direct beam on the rear bank, attenuated: ', bold('run 0041'), ', 5 min.'],
      'Beam centre and beam stop position stored in the instrument configuration.',
      [
        'First scattering pattern from ',
        bold('S-0031'),
        ' (SDS 5 wt%) at 25 °C: ',
        bold('run 0043'),
        '.',
      ],
    ),
    sampleInfo(SAMPLES.sds5),
    image(detectorImage(), 'Isotropic scattering ring on the rear detector for SDS 5 wt% at 25 °C'),
    p(
      'The pattern is isotropic with a clear first minimum near ',
      code('Q ≈ 0.23 Å⁻¹'),
      ', as expected for roughly 2 nm spherical micelles. ',
      highlight(
        'Empty-beam transmission is 0.96–1.00 depending on the attenuator, so we trust the beam monitor normalisation.',
      ),
    ),
  );
}

function samplePrepEntry(withContactNote: boolean): JSONContent {
  return doc(
    h(2, 'Sample preparation'),
    p(
      'All solutions were prepared in 99.9 % D₂O by weight and stirred for 30 minutes at 40 °C until clear. ',
      'SDS concentration is well above the critical micelle concentration (about 8 mM in water), so we expect micelles at every concentration measured.',
    ),
    table(
      ['ID', 'Composition', 'Concentration', 'Volume', 'Cell', 'pH'],
      [
        ['S-0031', 'SDS in D₂O', '5 wt% (≈ 173 mM)', '1.5 mL', 'Shear cell', '6.8'],
        ['S-0032', 'SDS in D₂O', '10 wt% (≈ 347 mM)', '1.5 mL', 'Shear cell', '6.7'],
        ['S-0033', 'D₂O (solvent only)', '–', '1.5 mL', 'Shear cell', '7.0'],
        ['S-0034', 'SDS + NaCl in D₂O', '5 wt% + 100 mM', '1.5 mL', 'Shear cell', '6.8'],
      ],
    ),
    sampleInfo(SAMPLES.sds5),
    sampleInfo(SAMPLES.sds10),
    h(3, 'Notes'),
    bullets(
      'Weighed on the lab balance (±0.1 mg); densities of D₂O solutions taken from the reference table, not measured.',
      [
        highlight(
          'D₂O is hygroscopic: keep the stock bottle capped and use a fresh aliquot for each batch.',
        ),
      ],
      'The 10 wt% sample is noticeably more viscous at 25 °C; it needs about 10 s to fill the 1 mm gap without bubbles.',
      'A solvent-only sample (S-0033) is needed at every temperature we use for the micelle data, for background subtraction.',
    ),
    ...(withContactNote
      ? [
          h(3, 'Addition from the local contact'),
          quote(
            p(
              'For the salt series use the same stock of SDS as S-0031. Different batches have given slightly different aggregation numbers on this instrument before. — ',
              LOCAL_CONTACT.name,
            ),
          ),
        ]
      : []),
    sampleInfo(SAMPLES.nacl),
    h(3, 'Sample environment'),
    image(shearCellSchematic(), 'Schematic of the Couette shear cell seen from above'),
    p(
      italic(
        'Schematic of the shear cell. The beam passes tangentially through the 1 mm gap between the stationary cup and the rotating bob.',
      ),
    ),
  );
}

type RunRow = [
  run: string,
  sample: string,
  temperature: string,
  minutes: string,
  transmission: string,
  note: string,
];

const RUNS: RunRow[] = [
  ['0041', 'Empty beam', '25', '5', '1.000', 'Direct beam, attenuator in'],
  ['0042', 'D₂O (S-0033)', '25', '20', '0.745', 'Solvent background'],
  ['0043', 'SDS 5 wt% (S-0031)', '25', '10', '0.731', 'Detector image in entry 1'],
  ['0044', 'SDS 5 wt% (S-0031)', '30', '10', '0.730', ''],
  ['0045', 'SDS 5 wt% (S-0031)', '35', '10', '0.731', ''],
  ['0046', 'SDS 5 wt% (S-0031)', '40', '10', '0.729', ''],
  ['0047', 'SDS 5 wt% (S-0031)', '45', '6', '0.730', 'ABORTED – beam trip 11:42'],
  ['0048', 'SDS 5 wt% (S-0031)', '45', '10', '0.731', 'Repeat of 0047'],
  ['0049', 'SDS 5 wt% (S-0031)', '50', '10', '0.728', ''],
  ['0050', 'SDS 5 wt% (S-0031)', '55', '10', '0.727', ''],
  ['0051', 'SDS 5 wt% (S-0031)', '60', '10', '0.726', ''],
  ['0052', 'D₂O (S-0033)', '60', '20', '0.739', 'Solvent background, 60 °C'],
  ['0053', 'SDS 10 wt% (S-0032)', '25', '10', '0.702', ''],
  ['0054', 'SDS 10 wt% (S-0032)', '60', '10', '0.697', ''],
  ['0055', 'SDS + NaCl (S-0034)', '25', '10', '0.729', ''],
  ['0056', 'SDS + NaCl (S-0034)', '60', '10', '0.724', ''],
  ['0057', 'Empty cell', '25', '15', '0.912', 'Cell background'],
  ['0058', 'B₄C beam block', '–', '10', '0.000', 'Ambient / electronic background'],
];

function runsEntry(stage: { rows: number; notes: boolean; plot: boolean }): JSONContent {
  const rows = RUNS.slice(0, stage.rows).map((row): string[] => [...row]);
  return doc(
    h(2, 'Temperature series without shear'),
    p(
      'Water bath ramped in 5 °C steps and allowed 10 minutes to equilibrate; the sample thermocouple settled within ±0.1 °C each time.',
    ),
    table(['Run', 'Sample', 'T (°C)', 'Time (min)', 'Transm.', 'Comment'], rows),
    ...(stage.notes
      ? [
          h(3, 'Observations'),
          bullets(
            [
              bold('Beam trip at 11:42: '),
              highlight('run 0047 was aborted after 6 minutes'),
              ' and repeated as 0048. 0047 is excluded from the analysis.',
            ],
            'Transmission of the 5 wt% sample changes by less than 1 % over the whole series, so no density correction is applied.',
            'The first minimum moves slightly to higher Q with temperature: the micelles shrink a little when heated.',
            'Cell and B₄C backgrounds (0057, 0058) are small compared with D₂O below Q = 0.2 Å⁻¹.',
          ),
          h(3, 'Script used'),
          codeBlock(
            '# temperature series, SDS 5 wt% (S-0031)\nfor temperature in range(25, 61, 5):\n    set_temperature(temperature, wait_stable=True, tolerance=0.1)\n    count(seconds=600)',
          ),
        ]
      : []),
    ...(stage.plot
      ? [
          h(3, 'Quick look'),
          image(iqPlot(), 'I(Q) for SDS 5 wt% at 25 °C and 60 °C after a first reduction'),
          p(
            italic(
              'Preliminary reduction at the instrument (solvent subtracted, absolute scale from the standard). Not final.',
            ),
          ),
        ]
      : []),
  );
}

function shearLeakEntry(): JSONContent {
  return doc(
    h(2, 'What happened'),
    p(
      'During the first step up to ',
      bold('500 s⁻¹'),
      ' on the 10 wt% sample, liquid appeared at the upper seal of the Couette cell. ',
      highlight('About 2 mL of sample was lost'),
      ' and the measurement was stopped before any data were taken.',
    ),
    h(3, 'Timeline'),
    bullets(
      '17:05 – cell mounted on the sample stage and filled with S-0032.',
      '17:40 – leak seen at the upper seal while ramping to 500 s⁻¹. Rotation stopped immediately.',
      '18:15 – local contact called; the seal was found to be flattened on one side.',
      '19:00 – new FFKM O-ring (22 × 2 mm) fitted, cell cleaned and refilled with fresh solution.',
      '19:30 – leak test: 15 minutes at 2500 s⁻¹, cell stayed dry.',
      '19:45 – alignment re-checked, beam centre unchanged within 0.2 mm.',
    ),
    quote(
      p(
        'The old O-ring had taken a set after the long storage. For the rest of the week please check the seal visually after every filling, and do not exceed 2500 s⁻¹ without calling me. — ',
        LOCAL_CONTACT.name,
      ),
    ),
    h(3, 'Impact and follow-up'),
    p('About 2.5 hours of beamtime lost. The shear series moves to the morning of day 3.'),
    tasks(
      ['Replace O-ring (spare fitted)', true],
      ['Leak test before each new sample', true],
      ['Order a second spare seal set for the next beamtime', false],
      ['Report the seal problem to the sample environment group', false],
    ),
  );
}

function shearSeriesEntry(): JSONContent {
  return doc(
    h(2, 'Shear series, SDS 10 wt% at 25 °C'),
    p(
      'Shear rate increased stepwise; each step was held for 2 minutes before counting for 10 minutes. Anisotropy is the intensity ratio of two 30° sectors, parallel and perpendicular to the flow.',
    ),
    table(
      ['Shear rate (s⁻¹)', 'Run', 'Anisotropy', 'Comment'],
      [
        ['0', '0059', '1.00', 'Reference, cell at rest'],
        ['100', '0060', '1.01', ''],
        ['500', '0061', '1.02', 'First step that failed yesterday – cell dry'],
        ['1000', '0062', '1.04', ''],
        ['2500', '0063', '1.09', 'Small but significant alignment'],
        ['0', '0064', '1.00', 'Back to rest: pattern fully recovers'],
      ],
    ),
    sampleInfo(SAMPLES.sds10),
    h(2, 'First reduction'),
    numbered(
      'Normalise to the beam monitor and subtract the cell (0057) and ambient (0058) backgrounds.',
      'Divide by the sample transmission and subtract the solvent run at the same temperature.',
      'Put on absolute scale using the standard measured at the start of the beamtime.',
      'Merge the three detector banks and rebin to 120 logarithmic Q bins.',
    ),
    codeBlock(
      '# illustrative workflow, notebook: loki_sds_reduction.ipynb\nworkflow = make_workflow(sample=43, solvent=42, empty_cell=57, ambient=58, empty_beam=41)\niq = workflow.compute(IofQ)   # 1D, 120 log-spaced Q bins',
    ),
    h(3, 'Model fits (polydisperse sphere)'),
    table(
      ['T (°C)', 'Radius (Å)', 'Polydispersity', 'Reduced χ²'],
      [
        ['25', '19.4 ± 0.1', '0.14', '1.3'],
        ['45', '19.0 ± 0.1', '0.14', '1.2'],
        ['60', '18.6 ± 0.1', '0.15', '1.4'],
      ],
    ),
    image(iqPlot(), 'I(Q) for SDS 5 wt% at 25 °C and 60 °C'),
    p(
      'The radius decreases by about 4 % between 25 and 60 °C, in line with the trend seen directly in the raw data. ',
      link(
        'Marcus is running the same fits with a core–shell model.',
        'https://europeanspallationsource.se',
      ),
    ),
    h(3, 'To do'),
    tasks(
      ['Repeat the 10 wt% shear series at 40 °C', false],
      ['Compare the sphere and core–shell fits', false],
      ['Ask Sofia about extra time for the NaCl sample under shear', false],
    ),
  );
}

function handoverEntry(): JSONContent {
  return doc(
    h(2, 'Handover and data management'),
    tasks(
      ['All raw files visible on the data share (runs 0041 – 0064)', true],
      ['Reduced data and notebook copied to the proposal folder', true],
      ['Samples labelled and stored in the fridge, remaining volume noted', true],
      ['Shear cell cleaned, dried and returned to sample environment', false],
      ['Beamtime feedback form sent to the user office', false],
    ),
    h(3, 'Where things are'),
    table(
      ['What', 'Where'],
      [
        ['Raw data', '/data/loki/2026-0412/raw/'],
        ['Reduced I(Q)', '/data/loki/2026-0412/reduced/'],
        ['Analysis notebook', 'loki_sds_reduction.ipynb in the proposal folder'],
        ['Samples', 'Fridge 2, shelf B, box "2026-0412"'],
      ],
    ),
    rule(),
    p(italic('Everything in this logbook can be exported to PDF from the Export button.')),
  );
}

// ───────────────────────────── assembly ─────────────────────────────

export function createDemoLogbook(owner: User, now = new Date()): LogbookBundle {
  const id = () => crypto.randomUUID();
  const logbookId = demoLogbookId('loki-sds', owner);

  const entry = (
    title: string,
    created: Date,
    updated: Date,
    by: User,
    content: JSONContent,
    revision: number,
  ): Entry => ({
    id: id(),
    logbookId,
    title,
    content,
    revision,
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString(),
    updatedBy: by,
  });
  const version = (
    e: Entry,
    savedAt: Date,
    by: User,
    reason: VersionReason,
    title: string,
    content: JSONContent,
  ): EntryVersion => ({
    id: id(),
    entryId: e.id,
    title,
    content,
    savedAt: savedAt.toISOString(),
    savedBy: by,
    reason,
  });

  const day1 = moment(now, 2, 8, 20);
  const prep = moment(now, 2, 13, 45);
  const series = moment(now, 1, 9, 30);
  const leak = moment(now, 1, 19, 50);
  const shear = moment(now, 0, 8, 15);
  const handover = moment(now, 0, 8, 40);

  const arrival = entry(
    'Day 1 – Arrival, safety checks and instrument setup',
    day1,
    later(day1, 95, now),
    owner,
    arrivalEntry(owner),
    17,
  );
  const samples = entry(
    'Sample preparation – SDS in D₂O series',
    prep,
    later(prep, 120, now),
    LOCAL_CONTACT,
    samplePrepEntry(true),
    11,
  );
  const runs = entry(
    'Runs 0041–0058 – temperature series (no shear)',
    series,
    later(series, 280, now),
    owner,
    runsEntry({ rows: RUNS.length, notes: true, plot: true }),
    24,
  );
  const leakEntry = entry(
    'Shear cell commissioning – leak at upper seal',
    leak,
    later(leak, 40, now),
    LOCAL_CONTACT,
    shearLeakEntry(),
    9,
  );
  const shearEntry = entry(
    'Shear series and first reduction',
    shear,
    later(shear, 18, now),
    owner,
    shearSeriesEntry(),
    6,
  );
  const handoverEntryRecord = entry(
    'Handover checklist and data management',
    handover,
    later(handover, 6, now),
    owner,
    handoverEntry(),
    3,
  );

  // Earlier states of the runs entry, so Version history has something to show.
  const versions: EntryVersion[] = [
    version(
      runs,
      later(series, 25, now),
      owner,
      'auto',
      'Runs 0041–0058 – temperature series',
      runsEntry({ rows: 6, notes: false, plot: false }),
    ),
    version(
      runs,
      later(series, 105, now),
      LOCAL_CONTACT,
      'auto',
      runs.title,
      runsEntry({ rows: 11, notes: false, plot: false }),
    ),
    version(
      runs,
      later(series, 190, now),
      owner,
      'manual',
      runs.title,
      runsEntry({ rows: RUNS.length, notes: true, plot: false }),
    ),
  ];

  const entries = [arrival, samples, runs, leakEntry, shearEntry, handoverEntryRecord];
  const logbook: Logbook = {
    id: logbookId,
    title: 'LoKI beamtime 2026-0412 – SDS micelles under shear',
    description:
      'Demo logbook with illustrative data: a three-day SANS beamtime with runs, samples, figures and history.',
    instrument: PROPOSAL.instrument,
    proposalId: PROPOSAL.proposalId,
    visibility: 'private',
    members: [
      { user: owner, role: 'owner' },
      { user: LOCAL_CONTACT, role: 'editor' },
      { user: REMOTE_COLLEAGUE, role: 'viewer' },
    ],
    demo: true,
    createdAt: later(day1, -60, now).toISOString(),
    updatedAt:
      entries
        .map((e) => e.updatedAt)
        .sort()
        .at(-1) ?? now.toISOString(),
  };
  return { logbook, entries, versions };
}
