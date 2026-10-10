import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { User } from './user.entity.js';

/**
 * Who a provider says someone is. The provider's stable id (`subject`) identifies the person, not their email,
 * which can change hands. One per provider and person; nothing else of the profile is kept.
 */
@Entity('user_identities')
@Unique('UQ_user_identities_user_issuer', ['userId', 'issuer'])
export class UserIdentity {
  @PrimaryColumn({ type: 'text' })
  issuer: string;

  @PrimaryColumn({ type: 'text' })
  subject: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Index()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: Relation<User>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
