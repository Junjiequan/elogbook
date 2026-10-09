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
import { ProposalRepository } from '../../../core/data-access/proposal.repository';
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
  templateUrl: './insert-sample-dialog.html',
  styleUrl: './insert-sample-dialog.scss',
})
export class InsertSampleDialog {
  private readonly dialogRef =
    inject<MatDialogRef<InsertSampleDialog, SampleInfoAttrs>>(MatDialogRef);
  private readonly proposalRepository = inject(ProposalRepository);

  protected readonly proposals = resource({ loader: () => this.proposalRepository.list() });
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
