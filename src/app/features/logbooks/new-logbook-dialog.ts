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
import { ExperimentContext, INSTRUMENTS } from '../../core/experiment-context/experiment-context';
import type { NewLogbook } from '../../core/models/logbook.models';

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
  template: `
    <h2 mat-dialog-title>New logbook</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="content">
        <mat-form-field>
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" cdkFocusInitial required />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Proposal (optional)</mat-label>
          <mat-select formControlName="proposalId" (selectionChange)="proposalChosen($event.value)">
            <mat-option [value]="null">None</mat-option>
            @for (p of proposals.value() ?? []; track p.id) {
              <mat-option [value]="p.id">{{ p.id }} – {{ p.title }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Instrument (optional)</mat-label>
          <mat-select formControlName="instrument">
            <mat-option [value]="null">None</mat-option>
            @for (name of instruments; track name) {
              <mat-option [value]="name">{{ name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="form.invalid">Create</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      width: min(520px, 80vw);
    }
  `,
})
export class NewLogbookDialog {
  private readonly dialogRef = inject<MatDialogRef<NewLogbookDialog, NewLogbook>>(MatDialogRef);
  private readonly context = inject(ExperimentContext);

  protected readonly instruments = INSTRUMENTS;
  protected readonly proposals = resource({ loader: () => this.context.proposals() });

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
