import {
  Check,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Entry, type EntryContent } from './entry.entity.js';

export type VersionReason = 'auto' | 'manual' | 'restore';

@Entity('entry_versions')
@Check('CHK_entry_versions_reason', "reason IN ('auto', 'manual', 'restore')")
export class EntryVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Entry, { onDelete: 'CASCADE', nullable: false })
  entry: Relation<Entry>;

  @Column({ type: 'uuid' })
  entryId: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'jsonb' })
  content: EntryContent;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  savedAt: Date;

  @ManyToOne(() => User, { nullable: false })
  savedBy: Relation<User>;

  @Column({ type: 'uuid' })
  savedById: string;

  @Column({ type: 'text' })
  reason: VersionReason;
}
