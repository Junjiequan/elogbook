import { Component, signal, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { JSONContent } from '@tiptap/core';
import { ProposalRepository } from '../../../core/data-access/proposal.repository';
import { DemoProposalRepository } from '../../../demo/demo-proposals';
import { RichTextEditor } from './rich-text-editor';

const doc = (text: string): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

@Component({
  imports: [RichTextEditor],
  template: `<app-rich-text-editor
    [docKey]="key()"
    [content]="content()"
    [editable]="editable()"
    (contentChange)="changes.push($event)"
  />`,
})
class Host {
  readonly key = signal('a');
  readonly content = signal(doc('first'));
  readonly editable = signal(true);
  readonly changes: JSONContent[] = [];
}

describe('RichTextEditor', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const text = () => fixture.nativeElement.querySelector('.rt-content')?.textContent;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ProposalRepository, useClass: DemoProposalRepository },
      ],
    });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the content', () => {
    expect(text()).toContain('first');
  });

  it('does not report a change when it is merely opened or toggled read-only', async () => {
    host.editable.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    host.editable.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.changes).toEqual([]);
  });

  it('shows no toolbar when read-only', async () => {
    expect(fixture.nativeElement.querySelector('app-editor-toolbar')).not.toBeNull();
    host.editable.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-editor-toolbar')).toBeNull();
  });

  it('rebuilds from the new content when the document key changes', async () => {
    host.content.set(doc('second'));
    host.key.set('b');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(text()).toContain('second');
    expect(text()).not.toContain('first');
  });
});
