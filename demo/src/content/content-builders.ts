import type { JSONContent } from './demo.types.js';

/** Tiny helpers for writing Tiptap documents as readable code. */
type Inline = string | JSONContent;

const inline = (parts: Inline[]): JSONContent[] =>
  parts.map((part) => (typeof part === 'string' ? { type: 'text', text: part } : part));

const marked = (text: string, type: string, attrs?: Record<string, unknown>): JSONContent => ({
  type: 'text',
  text,
  marks: [attrs ? { type, attrs } : { type }],
});

export const bold = (text: string) => marked(text, 'bold');
export const italic = (text: string) => marked(text, 'italic');
export const code = (text: string) => marked(text, 'code');
export const highlight = (text: string) => marked(text, 'highlight');
export const link = (text: string, href: string) => marked(text, 'link', { href });

export const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content });

export const p = (...parts: Inline[]): JSONContent =>
  parts.length ? { type: 'paragraph', content: inline(parts) } : { type: 'paragraph' };

export const h = (level: 1 | 2 | 3, text: string): JSONContent => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
});

const listItem = (item: Inline | Inline[]): JSONContent => ({
  type: 'listItem',
  content: [p(...(Array.isArray(item) ? item : [item]))],
});

export const bullets = (...items: (Inline | Inline[])[]): JSONContent => ({
  type: 'bulletList',
  content: items.map(listItem),
});

export const numbered = (...items: (Inline | Inline[])[]): JSONContent => ({
  type: 'orderedList',
  content: items.map(listItem),
});

export const tasks = (...items: [text: Inline | Inline[], done: boolean][]): JSONContent => ({
  type: 'taskList',
  content: items.map(([item, done]) => ({
    type: 'taskItem',
    attrs: { checked: done },
    content: [p(...(Array.isArray(item) ? item : [item]))],
  })),
});

export const table = (header: string[], rows: Inline[][]): JSONContent => {
  const cell = (type: 'tableHeader' | 'tableCell', content: Inline): JSONContent => ({
    type,
    content: [content === '' ? p() : p(content)],
  });
  return {
    type: 'table',
    content: [
      { type: 'tableRow', content: header.map((text) => cell('tableHeader', text)) },
      ...rows.map((row): JSONContent => ({
        type: 'tableRow',
        content: row.map((c) => cell('tableCell', c)),
      })),
    ],
  };
};

export const codeBlock = (text: string): JSONContent => ({
  type: 'codeBlock',
  attrs: { language: null },
  content: [{ type: 'text', text }],
});

export const quote = (...paragraphs: JSONContent[]): JSONContent => ({
  type: 'blockquote',
  content: paragraphs,
});

export const rule = (): JSONContent => ({ type: 'horizontalRule' });

export const image = (src: string, alt: string): JSONContent => ({
  type: 'image',
  attrs: { src, alt },
});

export interface SampleBlock {
  proposalId: string;
  proposalTitle: string;
  sampleId: string;
  sampleName: string;
  formula: string | null;
  instrument: string;
}

export const sampleInfo = (attrs: SampleBlock): JSONContent => ({ type: 'sampleInfo', attrs });
