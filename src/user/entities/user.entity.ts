import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type UserRole = 'superadmin' | 'admin' | 'guru' | 'siswa';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id_user!: number;

  @Column({ type: 'varchar', length: 120 })
  nama!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 25, nullable: true })
  no_hp!: string | null;

  @Column({ type: 'varchar', length: 80, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({
    type: 'enum',
    enum: ['superadmin', 'admin', 'guru', 'siswa'],
    default: 'siswa',
  })
  role!: UserRole;
}
