import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatOption, MatSelect } from '@angular/material/select';
import type {
  Logbook,
  LogbookMember,
  MemberRole,
  User,
  Visibility,
} from '../../core/models/logbook.models';
import { LogbooksStore } from '../logbooks/logbooks.store';

export interface ShareDialogData {
  logbook: Logbook;
  /** Only owners can change who has access. */
  canManage: boolean;
}

type GrantableRole = Exclude<MemberRole, 'owner'>;

@Component({
  selector: 'app-share-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatError,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatOption,
    MatRadioButton,
    MatRadioGroup,
    MatSelect,
    ReactiveFormsModule,
  ],
  templateUrl: './share-dialog.html',
  styleUrl: './share-dialog.scss',
})
export class ShareDialog {
  protected readonly data = inject<ShareDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ShareDialog>>(MatDialogRef);
  private readonly store = inject(LogbooksStore);

  protected readonly members = signal<LogbookMember[]>(this.data.logbook.members);
  protected readonly visibility = signal<Visibility>(this.data.logbook.visibility);
  protected readonly saving = signal(false);
  protected readonly dirty = computed(
    () =>
      this.visibility() !== this.data.logbook.visibility ||
      this.members() !== this.data.logbook.members,
  );

  protected readonly invite = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['editor' as GrantableRole],
  });

  protected addMember(form: FormGroupDirective): void {
    if (this.invite.invalid) {
      return;
    }
    const { email, role } = this.invite.getRawValue();
    const user = this.resolveUser(email.trim());
    if (this.members().some((m) => m.user.id === user.id)) {
      this.invite.controls.email.setErrors({ duplicate: true });
      return;
    }
    this.members.update((all) => [...all, { user, role }]);
    form.resetForm({ email: '', role });
  }

  protected setRole(member: LogbookMember, role: GrantableRole): void {
    this.members.update((all) => all.map((m) => (m === member ? { ...m, role } : m)));
  }

  protected remove(member: LogbookMember): void {
    this.members.update((all) => all.filter((m) => m !== member));
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      await this.store.updateSettings(this.data.logbook.id, {
        members: this.members(),
        visibility: this.visibility(),
      });
      this.dialogRef.close();
    } finally {
      this.saving.set(false);
    }
  }

  /** A user's id is their lower-case email, so access granted here matches them once they sign in. */
  private resolveUser(email: string): User {
    const name = email
      .split('@')[0]
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    const normalised = email.toLowerCase();
    return { id: normalised, name, email: normalised };
  }
}
