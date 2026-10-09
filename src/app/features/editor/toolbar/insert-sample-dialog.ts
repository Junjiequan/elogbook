import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { ExperimentContext } from '../../../core/experiment-context/experiment-context';
import type { SampleInfoAttrs } from '../extensions/sample-info';

@Component({
  selector: 'app-insert-sample-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormField,
    MatLabel,
    MatOption,
    MatSelect,
  ],
  template: `
    <h2 mat-dialog-title>Insert sample information</h2>
    <mat-dialog-content class="content">
      <mat-form-field>
        <mat-label>Proposal</mat-label>
        <mat-select [value]="proposalId()" (selectionChange)="selectProposal($event.value)">
          @for (p of proposals.value() ?? []; track p.id) {
            <mat-option [value]="p.id">{{ p.id }} – {{ p.title }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Sample</mat-label>
        <mat-select
          [value]="sampleId()"
          (selectionChange)="sampleId.set($event.value)"
          [disabled]="!proposal()"
        >
          @for (s of proposal()?.samples ?? []; track s.id) {
            <mat-option [value]="s.id">{{ s.id }} – {{ s.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [disabled]="!attrs()" (click)="insert()">Insert</button>
    </mat-dialog-actions>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      width: min(480px, 80vw);
    }
  `,
})
export class InsertSampleDialog {
  private readonly dialogRef =
    inject<MatDialogRef<InsertSampleDialog, SampleInfoAttrs>>(MatDialogRef);
  private readonly context = inject(ExperimentContext);

  protected readonly proposals = resource({ loader: () => this.context.proposals() });
  protected readonly proposalId = signal<string | null>(null);
  protected readonly sampleId = signal<string | null>(null);

  protected readonly proposal = computed(() =>
    this.proposals.value()?.find((p) => p.id === this.proposalId()),
  );
  protected readonly attrs = computed<SampleInfoAttrs | null>(() => {
    const proposal = this.proposal();
    const sample = proposal?.samples.find((s) => s.id === this.sampleId());
    return proposal && sample
      ? {
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          instrument: proposal.instrument,
          sampleId: sample.id,
          sampleName: sample.name,
          formula: sample.formula ?? null,
        }
      : null;
  });

  protected selectProposal(id: string): void {
    this.proposalId.set(id);
    this.sampleId.set(null);
  }

  protected insert(): void {
    this.dialogRef.close(this.attrs() ?? undefined);
  }
}
