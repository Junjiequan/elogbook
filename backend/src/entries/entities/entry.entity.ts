import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Logbook } from '../../logbooks/entities/logbook.entity.js';
import { User } from '../../users/entities/user.entity.js';

/** Rich-text document (TipTap/ProseMirror JSON). The API stores it as given. */
export type EntryContent = Record<string, unknown>;

export const EMPTY_CONTENT: EntryContent = { type: 'doc', content: [{ type: 'paragraph' }] };

@Entity('entries')
export class Entry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Logbook, { onDelete: 'CASCADE', nullable: false })
  logbook: Relation<Logbook>;

  @Column({ type: 'uuid' })
  logbookId: string;

  @Column({ type: 'text', default: '' })
  title: string;

  @Column({ type: 'jsonb' })
  content: EntryContent;

  /** Incremented on every save. A save must name the revision it was based on, so two people editing
   *  the same entry cannot silently overwrite each other. */
  @Column({ type: 'integer', default: 1 })
  revision: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: false })
  updatedBy: Relation<User>;

  @Column({ type: 'uuid' })
  updatedById: string;
}
