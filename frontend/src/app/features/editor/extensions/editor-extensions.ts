import type { Extensions } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import TextAlign from '@tiptap/extension-text-align';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { ImageUpload, type ImageUploadOptions } from './image-upload';
import { SampleInfo } from './sample-info';

export interface EditorExtensionOptions extends ImageUploadOptions {
  placeholder: string;
}

/** The document schema. Anything stored in a logbook must be expressible with these. */
export function createEditorExtensions(options: EditorExtensionOptions): Extensions {
  return [
    StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
    Image.configure({ allowBase64: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight,
    TextStyle,
    Color,
    Placeholder.configure({ placeholder: options.placeholder }),
    SampleInfo,
    ImageUpload.configure({ upload: options.upload, onError: options.onError }),
  ];
}
