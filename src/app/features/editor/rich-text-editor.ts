import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Editor, type JSONContent } from '@tiptap/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ImageService } from './image.service';
import { createEditorExtensions } from './extensions/editor-extensions';
import { EditorToolbar } from './toolbar/editor-toolbar';

/**
 * Angular wrapper around Tiptap (ProseMirror).
 *
 * `docKey` identifies the document being edited. When it changes the editor is rebuilt from
 * `content`, which also resets undo history so Ctrl+Z can never cross into another entry.
 * Later changes to `content` with the same key are ignored: the editor owns the live state.
 */
@Component({
  selector: 'app-rich-text-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [EditorToolbar],
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.scss',
  host: { class: 'rt-editor' },
})
export class RichTextEditor {
  readonly docKey = input.required<string>();
  readonly content = input.required<JSONContent>();
  readonly editable = input(true);
  readonly placeholder = input('Start writing…');

  readonly contentChange = output<JSONContent>();

  protected readonly editor = signal<Editor | null>(null);

  private readonly surface = viewChild<ElementRef<HTMLElement>>('surface');
  private readonly images = inject(ImageService);
  private readonly snackBar = inject(MatSnackBar);

  constructor() {
    effect(() => {
      const element = this.surface()?.nativeElement;
      this.docKey(); // rebuild whenever the document identity changes
      if (element) {
        untracked(() => this.mount(element));
      }
    });

    effect(() => {
      const editable = this.editable();
      // `false`: toggling editability is not a content change and must not trigger a save.
      untracked(() => this.editor()?.setEditable(editable, false));
    });

    inject(DestroyRef).onDestroy(() => this.editor()?.destroy());
  }

  private mount(element: HTMLElement): void {
    this.editor()?.destroy();
    element.replaceChildren();

    const editor = new Editor({
      element,
      content: this.content(),
      editable: this.editable(),
      extensions: createEditorExtensions({
        placeholder: this.placeholder(),
        upload: (file) => this.images.toDocumentUrl(file),
        onError: () =>
          this.snackBar.open('Could not insert the image.', 'Dismiss', { duration: 5000 }),
      }),
      editorProps: { attributes: { class: 'rt-content', 'aria-label': 'Logbook entry' } },
      onUpdate: ({ editor }) => {
        if (editor.isEditable) {
          this.contentChange.emit(editor.getJSON());
        }
      },
    });
    this.editor.set(editor);
  }
}
