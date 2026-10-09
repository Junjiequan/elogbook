import type { Editor } from '@tiptap/core';

export interface ToolbarAction {
  id: string;
  icon: string;
  label: string;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

export interface ToolbarGroup {
  id: string;
  /** Group is shown only while this returns true (e.g. table controls inside a table). */
  isVisible?: (editor: Editor) => boolean;
  actions: ToolbarAction[];
}

export const TOOLBAR_GROUPS: ToolbarGroup[] = [
  {
    id: 'history',
    actions: [
      {
        id: 'undo',
        icon: 'undo',
        label: 'Undo',
        isDisabled: (e) => !e.can().undo(),
        run: (e) => e.chain().focus().undo().run(),
      },
      {
        id: 'redo',
        icon: 'redo',
        label: 'Redo',
        isDisabled: (e) => !e.can().redo(),
        run: (e) => e.chain().focus().redo().run(),
      },
    ],
  },
  {
    id: 'marks',
    actions: [
      {
        id: 'bold',
        icon: 'format_bold',
        label: 'Bold',
        isActive: (e) => e.isActive('bold'),
        run: (e) => e.chain().focus().toggleBold().run(),
      },
      {
        id: 'italic',
        icon: 'format_italic',
        label: 'Italic',
        isActive: (e) => e.isActive('italic'),
        run: (e) => e.chain().focus().toggleItalic().run(),
      },
      {
        id: 'underline',
        icon: 'format_underlined',
        label: 'Underline',
        isActive: (e) => e.isActive('underline'),
        run: (e) => e.chain().focus().toggleUnderline().run(),
      },
      {
        id: 'strike',
        icon: 'format_strikethrough',
        label: 'Strikethrough',
        isActive: (e) => e.isActive('strike'),
        run: (e) => e.chain().focus().toggleStrike().run(),
      },
      {
        id: 'highlight',
        icon: 'ink_highlighter',
        label: 'Highlight',
        isActive: (e) => e.isActive('highlight'),
        run: (e) => e.chain().focus().toggleHighlight().run(),
      },
    ],
  },
  {
    id: 'lists',
    actions: [
      {
        id: 'bullet',
        icon: 'format_list_bulleted',
        label: 'Bulleted list',
        isActive: (e) => e.isActive('bulletList'),
        run: (e) => e.chain().focus().toggleBulletList().run(),
      },
      {
        id: 'ordered',
        icon: 'format_list_numbered',
        label: 'Numbered list',
        isActive: (e) => e.isActive('orderedList'),
        run: (e) => e.chain().focus().toggleOrderedList().run(),
      },
      {
        id: 'task',
        icon: 'checklist',
        label: 'Checklist',
        isActive: (e) => e.isActive('taskList'),
        run: (e) => e.chain().focus().toggleTaskList().run(),
      },
    ],
  },
  {
    id: 'align',
    actions: [
      {
        id: 'left',
        icon: 'format_align_left',
        label: 'Align left',
        isActive: (e) => e.isActive({ textAlign: 'left' }),
        run: (e) => e.chain().focus().setTextAlign('left').run(),
      },
      {
        id: 'center',
        icon: 'format_align_center',
        label: 'Align center',
        isActive: (e) => e.isActive({ textAlign: 'center' }),
        run: (e) => e.chain().focus().setTextAlign('center').run(),
      },
      {
        id: 'right',
        icon: 'format_align_right',
        label: 'Align right',
        isActive: (e) => e.isActive({ textAlign: 'right' }),
        run: (e) => e.chain().focus().setTextAlign('right').run(),
      },
    ],
  },
  {
    id: 'blocks',
    actions: [
      {
        id: 'quote',
        icon: 'format_quote',
        label: 'Quote',
        isActive: (e) => e.isActive('blockquote'),
        run: (e) => e.chain().focus().toggleBlockquote().run(),
      },
      {
        id: 'code',
        icon: 'code',
        label: 'Code block',
        isActive: (e) => e.isActive('codeBlock'),
        run: (e) => e.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: 'rule',
        icon: 'horizontal_rule',
        label: 'Divider',
        run: (e) => e.chain().focus().setHorizontalRule().run(),
      },
      {
        id: 'table',
        icon: 'table_chart',
        label: 'Insert table',
        run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
    ],
  },
  {
    id: 'table-tools',
    isVisible: (e) => e.isActive('table'),
    actions: [
      {
        id: 'row-add',
        icon: 'table_rows',
        label: 'Add row below',
        run: (e) => e.chain().focus().addRowAfter().run(),
      },
      {
        id: 'col-add',
        icon: 'view_column',
        label: 'Add column right',
        run: (e) => e.chain().focus().addColumnAfter().run(),
      },
      {
        id: 'row-del',
        icon: 'playlist_remove',
        label: 'Delete row',
        run: (e) => e.chain().focus().deleteRow().run(),
      },
      {
        id: 'col-del',
        icon: 'remove_road',
        label: 'Delete column',
        run: (e) => e.chain().focus().deleteColumn().run(),
      },
      {
        id: 'table-del',
        icon: 'delete',
        label: 'Delete table',
        run: (e) => e.chain().focus().deleteTable().run(),
      },
    ],
  },
];

export interface BlockStyle {
  id: string;
  label: string;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

export const BLOCK_STYLES: BlockStyle[] = [
  {
    id: 'p',
    label: 'Paragraph',
    isActive: (e) => !e.isActive('heading'),
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: 'h1',
    label: 'Heading 1',
    isActive: (e) => e.isActive('heading', { level: 1 }),
    run: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    isActive: (e) => e.isActive('heading', { level: 2 }),
    run: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    isActive: (e) => e.isActive('heading', { level: 3 }),
    run: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
];
