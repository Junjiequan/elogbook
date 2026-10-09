import { Editor, type JSONContent } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { createEditorExtensions } from './editor-extensions';
import { moveBlock } from './sample-info';

const paragraph = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});
const sample: JSONContent = {
  type: 'sampleInfo',
  attrs: { sampleName: 'SDS 5 wt%', sampleId: 'S-0031', instrument: 'LoKI' },
};

describe('sample information block', () => {
  let editor: Editor;

  /** Block order, ignoring the empty paragraph the editor keeps after a final block. */
  const order = () =>
    editor
      .getJSON()
      .content!.filter((n) => n.type !== 'paragraph' || n.content?.length)
      .map((n) => (n.type === 'paragraph' ? (n.content![0] as { text?: string }).text : n.type));
  const positionOfSample = () => {
    let found = -1;
    editor.state.doc.forEach((node, offset) => node.type.name === 'sampleInfo' && (found = offset));
    return found;
  };

  beforeEach(() => {
    editor = new Editor({
      extensions: createEditorExtensions({
        placeholder: '',
        upload: () => Promise.reject(),
        onError: () => undefined,
      }),
      content: { type: 'doc', content: [paragraph('first'), sample, paragraph('last')] },
    });
  });

  afterEach(() => editor.destroy());

  it('moves up and down one step at a time', () => {
    expect(moveBlock(editor, positionOfSample(), -1)).toBeTrue();
    expect(order()).toEqual(['sampleInfo', 'first', 'last']);

    expect(moveBlock(editor, positionOfSample(), 1)).toBeTrue();
    expect(order()).toEqual(['first', 'sampleInfo', 'last']);

    expect(moveBlock(editor, positionOfSample(), 1)).toBeTrue();
    expect(order()).toEqual(['first', 'last', 'sampleInfo']);
  });

  it('does nothing at the top or the bottom', () => {
    moveBlock(editor, positionOfSample(), -1);
    expect(moveBlock(editor, positionOfSample(), -1)).toBeFalse();
    expect(order()).toEqual(['sampleInfo', 'first', 'last']);

    moveBlock(editor, positionOfSample(), 1);
    moveBlock(editor, positionOfSample(), 1);
    expect(moveBlock(editor, positionOfSample(), 1)).toBeFalse();
    expect(order()).toEqual(['first', 'last', 'sampleInfo']);
  });

  it('keeps the block selected so it can be moved again, and keeps its details', () => {
    moveBlock(editor, positionOfSample(), -1);

    const selection = editor.state.selection;
    expect(selection instanceof NodeSelection && selection.node.type.name).toBe('sampleInfo');
    expect(editor.getJSON().content![0].attrs!['sampleId']).toBe('S-0031');
  });

  it('can be undone in one step', () => {
    moveBlock(editor, positionOfSample(), -1);
    editor.commands.undo();

    expect(order()).toEqual(['first', 'sampleInfo', 'last']);
  });

  it('shows the move and remove controls in the editor', () => {
    const dom = editor.view.dom;

    expect(dom.querySelector('.sample-info__grip')).not.toBeNull();
    expect(
      Array.from(dom.querySelectorAll('.sample-info__button')).map((b) =>
        b.getAttribute('aria-label'),
      ),
    ).toEqual(['Move up', 'Move down', 'Remove sample information']);
    expect(dom.querySelector('.sample-info strong')?.textContent).toBe('Sample: SDS 5 wt%');
  });

  it('removes the block from its button', () => {
    editor.view.dom.querySelector<HTMLButtonElement>('[data-action="remove"]')!.click();

    expect(order()).toEqual(['first', 'last']);
  });
});
