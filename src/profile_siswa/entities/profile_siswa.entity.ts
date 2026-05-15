import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Siswa } from '../../siswa/entities/siswa.entity';

@Entity('profile_siswa')
export class ProfileSiswa {
  @PrimaryGeneratedColumn()
  id_profile_siswa!: number;

  @Column({ type: 'int', unique: true })
  id_siswa!: number;

  @OneToOne(() => Siswa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_siswa' })
  siswa!: Siswa;

  @Column({ type: 'simple-json', nullable: true })
  minat!: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  hobi!: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  bakat!: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  skill!: string[] | null;

  @Column({ type: 'text', nullable: true })
  prestasi!: string | null;

  @Column({ type: 'text', nullable: true })
  tujuan!: string | null;

  @Column({ type: 'text', nullable: true })
  preferensi_belajar!: string | null;

  @Column({ type: 'text', nullable: true })
  kendala!: string | null;
}
