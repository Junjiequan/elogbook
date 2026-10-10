import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { LogbookMember } from './logbook-member.entity.js';

/** `private`: only listed members. `facility-read`: any signed-in user may read. */
export type Visibility = 'private' | 'facility-read';
export const VISIBILITIES: readonly Visibility[] = ['private', 'facility-read'];

@Entity('logbooks')
@Check('CHK_logbooks_visibility', "visibility IN ('private', 'facility-read')")
export class Logbook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'text', nullable: true })
  instrument: string | null;

  @Column({ type: 'text', nullable: true })
  proposalId: string | null;

  @Column({ type: 'text', default: 'private' })
  visibility: Visibility;

  @OneToMany(() => LogbookMember, (member) => member.logbook)
  members: Relation<LogbookMember[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
