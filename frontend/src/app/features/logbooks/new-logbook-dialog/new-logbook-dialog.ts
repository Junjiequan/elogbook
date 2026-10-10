import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { ProposalRepository } from '../../../core/data-access/proposal.repository';
import { INSTRUMENTS } from '../../../core/models/proposal.models';
import type { NewLogbook } from '../../../core/models/logbook.models';

@Component({
  selector: 'app-new-logbook-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormField,
    MatInput,
    MatLabel,
    MatOption,
    MatSelect,
    ReactiveFormsModule,
  ],
  templateUrl: './new-logbook-dialog.html',
  styleUrl: './new-logbook-dialog.scss',
})
export class NewLogbookDialog {
  private readonly dialogRef = inject<MatDialogRef<NewLogbookDialog, NewLogbook>>(MatDialogRef);
  private readonly proposalRepository = inject(ProposalRepository);

  protected readonly instruments = INSTRUMENTS;
  protected readonly proposals = resource({ loader: () => this.proposalRepository.list() });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.pattern(/\S/)]],
    description: [''],
    proposalId: [null as string | null],
    instrument: [null as string | null],
  });

  protected proposalChosen(id: string | null): void {
    const proposal = this.proposals.value()?.find((p) => p.id === id);
    if (proposal) {
      this.form.patchValue({ instrument: proposal.instrument });
      if (!this.form.controls.title.value.trim()) {
        this.form.patchValue({ title: `${proposal.instrument} – ${proposal.title}` });
      }
    }
  }

  protected submit(): void {
    if (this.form.valid) {
      const { title, description, proposalId, instrument } = this.form.getRawValue();
      this.dialogRef.close({
        title: title.trim(),
        description: description.trim(),
        proposalId,
        instrument,
      });
    }
  }
}
