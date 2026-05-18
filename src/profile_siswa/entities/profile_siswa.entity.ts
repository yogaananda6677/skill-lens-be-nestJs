import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Siswa } from '../../siswa/entities/siswa.entity';
import { SiswaTag } from '../../siswa_tag/entities/siswa_tag.entity';

@Entity('profile_siswa')
export class ProfileSiswa {
  @PrimaryGeneratedColumn()
  id_profile_siswa!: number;

  @Column({ type: 'int', unique: true })
  id_siswa!: number;

  @OneToOne(() => Siswa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_siswa' })
  siswa!: Siswa;

  @Column({ type: 'text', nullable: true })
  tujuan_karir!: string | null;

  @Column({ type: 'text', nullable: true })
  prestasi!: string | null;

  @OneToMany(() => SiswaTag, (siswaTag) => siswaTag.profileSiswa)
  siswaTags!: SiswaTag[];
}
