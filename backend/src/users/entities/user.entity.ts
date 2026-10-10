import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Always lower-case: the email is how people are found and shared with. */
  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'text' })
  name: string;

  /** Only read when logging in (`select: false`), so it can never leak through an API response. */
  @Column({ type: 'text', nullable: true, select: false })
  passwordHash: string | null;

  /** Extra roles, e.g. `admin`. Emails listed in `ADMIN_EMAILS` get `admin` as well. */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  roles: string[];

  /**
   * True for a person who was added to a logbook by email before ever signing in. Registering with
   * that email later claims the account, and with it the logbooks already shared with them.
   */
  @Column({ type: 'boolean', default: false })
  invited: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
