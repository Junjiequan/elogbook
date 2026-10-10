/** A beamtime proposal with the instrument it is for and the samples it brings. */
export interface Proposal {
  id: string;
  title: string;
  instrument: string;
  samples: { id: string; name: string; formula?: string }[];
}

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/** Checks the content of the proposals file, and says everything that is wrong with it at once. */
export function parseProposals(json: unknown): Proposal[] {
  if (!Array.isArray(json)) {
    throw new Error('The proposals file must contain a list of proposals: [ { "id": ... } ].');
  }
  const problems: string[] = [];
  const seen = new Set<string>();

  const proposals = json.map((entry: unknown, index): Proposal => {
    const label = `proposal ${index + 1}`;
    const { id, title, instrument, samples } = (entry ?? {}) as Record<string, unknown>;
    if (!isText(id)) problems.push(`${label}: "id" is required`);
    if (isText(id) && seen.has(id)) problems.push(`${id}: listed twice`);
    if (isText(id)) seen.add(id);
    const who = isText(id) ? id : label;
    if (!isText(title)) problems.push(`${who}: "title" is required`);
    if (!isText(instrument)) problems.push(`${who}: "instrument" is required`);
    if (!Array.isArray(samples)) problems.push(`${who}: "samples" must be a list`);

    const list = (Array.isArray(samples) ? samples : []).map((sample: unknown, i) => {
      const { id: sampleId, name, formula } = (sample ?? {}) as Record<string, unknown>;
      if (!isText(sampleId) || !isText(name)) {
        problems.push(`${who}: sample ${i + 1} needs an "id" and a "name"`);
      }
      return {
        id: isText(sampleId) ? sampleId : '',
        name: isText(name) ? name : '',
        ...(isText(formula) ? { formula } : {}),
      };
    });
    return {
      id: isText(id) ? id : '',
      title: isText(title) ? title : '',
      instrument: isText(instrument) ? instrument : '',
      samples: list,
    };
  });

  if (problems.length > 0) {
    throw new Error(`The proposals file is not valid:\n - ${problems.join('\n - ')}`);
  }
  return proposals;
}
