import { Check, Column, Entity, Index, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Logbook } from './logbook.entity.js';

export type MemberRole = 'owner' | 'editor' | 'viewer';
export const MEMBER_ROLES: readonly MemberRole[] = ['owner', 'editor', 'viewer'];

@Entity('logbook_members')
@Check('CHK_logbook_members_role', "role IN ('owner', 'editor', 'viewer')")
export class LogbookMember {
  @PrimaryColumn({ type: 'uuid' })
  logbookId: string;

  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  role: MemberRole;

  @ManyToOne(() => Logbook, (logbook) => logbook.members, { onDelete: 'CASCADE' })
  logbook: Relation<Logbook>;

  /** "Which logbooks can this person open?" is the main query of the list page. */
  @Index()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: Relation<User>;
}
