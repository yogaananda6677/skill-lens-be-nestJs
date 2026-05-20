import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Sekolah } from '../../sekolah/entities/sekolah.entity';

export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'admin_sekolah'
  | 'guru'
  | 'siswa';

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
    enum: ['superadmin', 'admin', 'admin_sekolah', 'guru', 'siswa'],
    default: 'siswa',
  })
  role!: UserRole;

  // Dipakai untuk role admin_sekolah agar aksesnya tidak global.
  @Column({ type: 'int', nullable: true })
  id_sekolah!: number | null;

  @ManyToOne(() => Sekolah, { nullable: true })
  @JoinColumn({ name: 'id_sekolah' })
  sekolah!: Sekolah | null;

  @Column({ type: 'tinyint', default: 0 })
  must_change_password!: number;
}
