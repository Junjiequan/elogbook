import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import type { Editor } from '@tiptap/core';
import { firstValueFrom } from 'rxjs';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { ImageService } from '../image.service';
import { PromptDialog, type PromptDialogData } from '../../../shared/prompt-dialog/prompt-dialog';
import type { SampleInfoAttrs } from '../extensions/sample-info';
import { InsertSampleDialog } from './insert-sample-dialog';
import { BLOCK_STYLES, TOOLBAR_GROUPS } from './toolbar-actions';

@Component({
  selector: 'app-editor-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatIcon, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatTooltip],
  templateUrl: './editor-toolbar.html',
  styleUrl: './editor-toolbar.scss',
})
export class EditorToolbar {
  readonly editor = input.required<Editor>();

  private readonly dialog = inject(MatDialog);
  private readonly images = inject(ImageService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly groups = TOOLBAR_GROUPS;
  protected readonly blockStyles = BLOCK_STYLES;

  /** Bumped on every editor transaction so state-derived bindings re-evaluate. */
  private readonly transactions = signal(0);

  constructor() {
    effect((onCleanup) => {
      const editor = this.editor();
      const bump = () => this.transactions.update((n) => n + 1);
      editor.on('transaction', bump);
      onCleanup(() => editor.off('transaction', bump));
    });
  }

  /** The editor, read through the transaction signal so callers re-render on every change. */
  protected state(): Editor {
    this.transactions();
    return this.editor();
  }

  protected currentBlockLabel(): string {
    const editor = this.state();
    return (this.blockStyles.find((s) => s.isActive(editor)) ?? this.blockStyles[0]).label;
  }

  protected async editLink(): Promise<void> {
    const editor = this.editor();
    const url = await this.ask({
      title: 'Link',
      label: 'URL',
      value: (editor.getAttributes('link')['href'] as string | undefined) ?? 'https://',
      confirmLabel: 'Apply',
      hint: 'Leave empty to remove the link',
    });
    if (url === undefined) {
      return;
    }
    const href = url.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    (href && href !== 'https://' ? chain.setLink({ href }) : chain.unsetLink()).run();
  }

  protected async insertSample(): Promise<void> {
    const attrs = await firstValueFrom(
      this.dialog.open<InsertSampleDialog, void, SampleInfoAttrs>(InsertSampleDialog).afterClosed(),
    );
    if (attrs) {
      this.editor().chain().focus().insertContent({ type: 'sampleInfo', attrs }).run();
    }
  }

  protected async insertImages(input: HTMLInputElement): Promise<void> {
    const files = Array.from(input.files ?? []);
    input.value = '';
    try {
      for (const file of files) {
        const src = await this.images.toDocumentUrl(file);
        this.editor().chain().focus().setImage({ src, alt: file.name }).run();
      }
    } catch {
      this.snackBar.open('Could not insert the image.', 'Dismiss', { duration: 5000 });
    }
  }

  private ask(data: PromptDialogData): Promise<string | undefined> {
    return firstValueFrom(
      this.dialog
        .open<PromptDialog, PromptDialogData, string>(PromptDialog, { data })
        .afterClosed(),
    );
  }
}
