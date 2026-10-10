import { type Editor, mergeAttributes, Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

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

/** One-line description shown in the block, shared by the editor view and the clipboard/HTML output. */
function describe(attrs: Record<string, unknown>): { title: string; details: string } {
  const { sampleName, sampleId, formula, proposalId, proposalTitle, instrument } = attrs as Record<
    string,
    string | null
  >;
  const details = [
    sampleId && `ID ${sampleId}`,
    formula,
    proposalId && `Proposal ${proposalId}${proposalTitle ? ` – ${proposalTitle}` : ''}`,
    instrument,
  ].filter(Boolean);
  return { title: `Sample: ${sampleName ?? 'unknown'}`, details: details.join(' · ') };
}

/**
 * Moves the block at `pos` one step up (-1) or down (+1) among its siblings, keeping it selected.
 * Returns false when it is already at the edge.
 */
export function moveBlock(editor: Editor, pos: number, direction: -1 | 1): boolean {
  const { state, view } = editor;
  const node = state.doc.nodeAt(pos);
  if (!node) {
    return false;
  }
  const $pos = state.doc.resolve(pos);
  const neighbourIndex = $pos.index() + direction;
  if (neighbourIndex < 0 || neighbourIndex >= $pos.parent.childCount) {
    return false;
  }
  const neighbour = $pos.parent.child(neighbourIndex);
  // The editor keeps an empty paragraph after a final block so there is always somewhere to type;
  // moving past it would just make it reappear, so the block stops at the last real content.
  const isTrailingSpacer =
    direction > 0 &&
    neighbourIndex === $pos.parent.childCount - 1 &&
    neighbour.type.name === 'paragraph' &&
    neighbour.content.size === 0;
  if (isTrailingSpacer) {
    return false;
  }
  const tr = state.tr;
  let newPos: number;
  if (direction < 0) {
    newPos = pos - neighbour.nodeSize;
    tr.delete(pos, pos + node.nodeSize).insert(newPos, node);
  } else {
    newPos = pos + neighbour.nodeSize;
    tr.insert(pos + node.nodeSize + neighbour.nodeSize, node).delete(pos, pos + node.nodeSize);
  }
  view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, newPos)).scrollIntoView());
  return true;
}

function button(icon: string, label: string, action: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'sample-info__button';
  element.dataset['action'] = action;
  element.title = label;
  element.setAttribute('aria-label', label);
  const glyph = document.createElement('span');
  glyph.className = 'material-icons';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = icon;
  element.append(glyph);
  return element;
}

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
    const { title, details } = describe(node.attrs);
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'sample-info', class: 'sample-info' }),
      ['strong', {}, title],
      ['span', {}, details],
    ];
  },

  /**
   * In the editor the block gets a drag handle plus move up / move down / remove buttons, so it is
   * obvious that it can be rearranged. They are hidden when the document is read-only (see styles).
   */
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('div');
      dom.className = 'sample-info';
      dom.dataset['type'] = 'sample-info';

      const grip = document.createElement('span');
      grip.className = 'sample-info__grip material-icons';
      grip.dataset['dragHandle'] = '';
      grip.title = 'Drag to move';
      grip.setAttribute('aria-hidden', 'true');
      grip.textContent = 'drag_indicator';

      const body = document.createElement('div');
      body.className = 'sample-info__body';
      const title = document.createElement('strong');
      const details = document.createElement('span');
      body.append(title, details);

      const tools = document.createElement('span');
      tools.className = 'sample-info__tools';
      tools.append(
        button('arrow_upward', 'Move up', 'up'),
        button('arrow_downward', 'Move down', 'down'),
        button('delete', 'Remove sample information', 'remove'),
      );

      const render = (current: typeof node) => {
        const text = describe(current.attrs);
        title.textContent = text.title;
        details.textContent = text.details;
      };
      render(node);
      dom.append(grip, body, tools);

      tools.addEventListener('click', (event) => {
        const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset[
          'action'
        ];
        const pos = getPos();
        if (!action || pos === undefined || !editor.isEditable) {
          return;
        }
        if (action === 'remove') {
          editor
            .chain()
            .focus()
            .deleteRange({ from: pos, to: pos + node.nodeSize })
            .run();
        } else {
          moveBlock(editor, pos, action === 'up' ? -1 : 1);
          editor.view.focus();
        }
      });

      return {
        dom,
        update: (updated) => {
          if (updated.type !== node.type) {
            return false;
          }
          render(updated);
          return true;
        },
        // Let our buttons and the drag handle work without ProseMirror interfering.
        stopEvent: (event) =>
          !!(event.target as HTMLElement).closest('.sample-info__tools, .sample-info__grip'),
      };
    };
  },
});
