import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn
} from 'typeorm';

import { Siswa } from '../../siswa/entities/siswa.entity';
import { KurikulumMapel } from '../../kurikulum_mapel/entities/kurikulum_mapel.entity';

@Entity()
export class NilaiSiswa {

  @PrimaryGeneratedColumn()
  id_nilai!: number;

  @Column('float')
  nilai!: number;

  @ManyToOne(() => Siswa)
  @JoinColumn({ name: 'id_siswa' })
  siswa!: Siswa;

  @ManyToOne(() => KurikulumMapel)
  @JoinColumn({ name: 'id_kurikulum_mapel' })
  kurikulum_mapel!: KurikulumMapel;
}