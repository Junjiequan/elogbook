import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
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

  /**
   * The person responsible for the logbook: who created it, or who it was handed over to. Always also a
   * member with the `owner` role (the service keeps the two together); other members may be owners too.
   */
  @Index()
  @ManyToOne(() => User, { nullable: false })
  owner: Relation<User>;

  @Column({ type: 'uuid' })
  ownerId: string;

  @OneToMany(() => LogbookMember, (member) => member.logbook)
  members: Relation<LogbookMember[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
