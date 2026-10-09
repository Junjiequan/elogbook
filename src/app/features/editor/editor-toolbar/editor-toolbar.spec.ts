import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Editor } from '@tiptap/core';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAX_IMAGE_BYTES } from '../image.service';
import { createEditorExtensions } from '../extensions/editor-extensions';
import { EditorToolbar } from './editor-toolbar';

describe('EditorToolbar', () => {
  let fixture: ComponentFixture<EditorToolbar>;
  let editor: Editor;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  const el = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    el().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    editor = new Editor({
      element: document.createElement('div'),
      content: '<p>some text</p>',
      extensions: createEditorExtensions({
        placeholder: '',
        upload: async () => 'data:image/png;base64,AAAA',
        onError: () => undefined,
      }),
    });
    fixture = TestBed.createComponent(EditorToolbar);
    fixture.componentRef.setInput('editor', editor);
    await settle();
  });

  afterEach(() => editor.destroy());

  it('is a labelled toolbar with the formatting buttons', () => {
    expect(el().querySelector('[role="toolbar"]')!.getAttribute('aria-label')).toBe('Formatting');
    for (const label of ['Bold', 'Italic', 'Undo', 'Insert table', 'Link', 'Insert image']) {
      expect(button(label)).withContext(label).not.toBeNull();
    }
  });

  it('applies formatting to the editor and shows which buttons are on', async () => {
    editor.commands.selectAll();
    expect(button('Bold').getAttribute('aria-pressed')).toBe('false');

    button('Bold').click();
    await settle();

    expect(editor.isActive('bold')).toBeTrue();
    expect(button('Bold').getAttribute('aria-pressed')).toBe('true');
  });

  it('disables Undo until there is something to undo', async () => {
    expect(button('Undo').disabled).toBeTrue();

    editor.commands.insertContent('more');
    await settle();

    expect(button('Undo').disabled).toBeFalse();
  });

  it('names the current block style', async () => {
    expect(el().querySelector('.block-style')!.textContent).toContain('Paragraph');

    editor.commands.setHeading({ level: 2 });
    await settle();

    expect(el().querySelector('.block-style')!.textContent).toContain('Heading 2');
  });

  it('shows the table tools only while the cursor is in a table', async () => {
    expect(button('Add row below')).toBeNull();

    button('Insert table').click();
    await settle();

    expect(editor.isActive('table')).toBeTrue();
    expect(button('Add row below')).not.toBeNull();
  });

  it('turns the selected text into a link with the address that was typed', async () => {
    dialog.open.and.returnValue({ afterClosed: () => of('https://example.org') } as never);
    editor.commands.selectAll();

    button('Link').click();
    await settle();

    expect(editor.getHTML()).toContain('href="https://example.org"');
  });

  it('leaves the text alone when the link dialog is cancelled', async () => {
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as never);
    editor.commands.selectAll();

    button('Link').click();
    await settle();

    expect(editor.getHTML()).not.toContain('href');
  });

  it('inserts the sample information chosen in the dialog', async () => {
    const attrs = {
      proposalId: '2026-0412',
      proposalTitle: 'Micelle structure under shear',
      instrument: 'LoKI',
      sampleId: 'S-0031',
      sampleName: 'SDS 5 wt%',
      formula: null,
    };
    dialog.open.and.returnValue({ afterClosed: () => of(attrs) } as never);

    button('Insert sample information').click();
    await settle();

    expect(JSON.stringify(editor.getJSON())).toContain('"sampleInfo"');
  });

  describe('images', () => {
    const choose = async (file: File) => {
      const input = el().querySelector<HTMLInputElement>('input[type="file"]')!;
      const files = new DataTransfer();
      files.items.add(file);
      input.files = files.files;
      input.dispatchEvent(new Event('change'));
      await settle();
      await new Promise((resolve) => setTimeout(resolve, 50)); // reading the file takes a moment
      await settle();
    };

    it('puts a chosen image into the document exactly as it is', async () => {
      await choose(new File([new Uint8Array([1, 2, 3])], 'plot.png', { type: 'image/png' }));

      expect(editor.getHTML()).toContain('<img src="data:image/png;base64,AQID"');
      expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('explains when an image is too large', async () => {
      await choose(
        new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'huge.png', { type: 'image/png' }),
      );

      expect(editor.getHTML()).not.toContain('<img');
      expect(snackBar.open.calls.mostRecent().args[0]).toContain('at most 20 MB');
    });

    it('has a separate camera button for tablets and phones', () => {
      const camera = el().querySelector('input[capture]')!;
      expect(camera.getAttribute('accept')).toBe('image/*');
      expect(button('Take photo')).not.toBeNull();
    });
  });
});
