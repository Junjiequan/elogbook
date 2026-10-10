import { Column, Entity, Index, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Entry } from '../../entries/entities/entry.entity.js';
import { User } from '../../users/entities/user.entity.js';

/** One person's pin on one entry. The key is both ids, so pinning twice cannot make two. */
@Entity('pinned_entries')
export class PinnedEntry {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @PrimaryColumn({ type: 'uuid' })
  entryId: string;

  /** Place in the person's own order; 0 is first. */
  @Column({ type: 'integer' })
  position: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  pinnedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: Relation<User>;

  @Index()
  @ManyToOne(() => Entry, { onDelete: 'CASCADE' })
  entry: Relation<Entry>;
}
