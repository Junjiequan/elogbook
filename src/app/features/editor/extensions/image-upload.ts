import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export interface ImageUploadOptions {
  /** Turns a file into a URL the document can reference. */
  upload: (file: File) => Promise<string>;
  onError: (error: unknown) => void;
}

const imageFilesOf = (files: FileList | null | undefined): File[] =>
  Array.from(files ?? []).filter((f) => f.type.startsWith('image/'));

/**
 * Handles images arriving as files: screenshots pasted from analysis software, and files
 * dropped onto the page. HTML pastes (Word, Excel, web pages) are left to ProseMirror, because
 * those clipboards often carry a rendered bitmap *next to* the real content.
 */
export const ImageUpload = Extension.create<ImageUploadOptions>({
  name: 'imageUpload',

  addOptions() {
    return {
      upload: () => Promise.reject(new Error('ImageUpload.upload is not configured')),
      onError: () => undefined,
    };
  },

  addProseMirrorPlugins() {
    const { upload, onError } = this.options;

    const insert = async (view: EditorView, files: File[], pos: number) => {
      try {
        for (const file of files) {
          const src = await upload(file);
          const node = view.state.schema.nodes['image'].create({ src, alt: file.name });
          // Positions may have shifted while the upload ran.
          const at = Math.min(pos, view.state.doc.content.size);
          view.dispatch(view.state.tr.insert(at, node));
          pos = at + node.nodeSize;
        }
      } catch (error) {
        onError(error);
      }
    };

    return [
      new Plugin({
        key: new PluginKey('imageUpload'),
        props: {
          handlePaste: (view, event) => {
            const data = event.clipboardData;
            const files = imageFilesOf(data?.files);
            const hasText =
              !!data && (data.types.includes('text/html') || data.types.includes('text/plain'));
            if (!files.length || hasText) {
              return false;
            }
            event.preventDefault();
            void insert(view, files, view.state.selection.to);
            return true;
          },
          handleDrop: (view, event) => {
            const files = imageFilesOf(event.dataTransfer?.files);
            if (!files.length) {
              return false;
            }
            event.preventDefault();
            const pos =
              view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ??
              view.state.selection.to;
            void insert(view, files, pos);
            return true;
          },
        },
      }),
    ];
  },
});
