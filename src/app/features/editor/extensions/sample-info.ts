import { mergeAttributes, Node } from '@tiptap/core';

export const SAMPLE_INFO_FIELDS = [
  'proposalId',
  'proposalTitle',
  'sampleId',
  'sampleName',
  'formula',
  'instrument',
] as const;

export type SampleInfoAttrs = Record<(typeof SAMPLE_INFO_FIELDS)[number], string | null>;

const dataAttr = (field: string) => `data-${field.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/**
 * Block that records which sample / proposal / instrument a stretch of the logbook refers to.
 * Stored as structured attributes so it can later be searched, linked to the proposal system,
 * or generated automatically from control software.
 */
export const SampleInfo = Node.create({
  name: 'sampleInfo',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return Object.fromEntries(
      SAMPLE_INFO_FIELDS.map((field) => [
        field,
        {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute(dataAttr(field)),
          renderHTML: (attrs: Record<string, unknown>) =>
            attrs[field] == null ? {} : { [dataAttr(field)]: attrs[field] },
        },
      ]),
    );
  },

  parseHTML() {
    return [{ tag: 'div[data-type="sample-info"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { sampleName, sampleId, formula, proposalId, proposalTitle, instrument } = node.attrs;
    const details = [
      sampleId && `ID ${sampleId}`,
      formula,
      proposalId && `Proposal ${proposalId}${proposalTitle ? ` – ${proposalTitle}` : ''}`,
      instrument,
    ].filter(Boolean);
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'sample-info', class: 'sample-info' }),
      ['strong', {}, `Sample: ${sampleName ?? 'unknown'}`],
      ['span', {}, details.join(' · ')],
    ];
  },
});
