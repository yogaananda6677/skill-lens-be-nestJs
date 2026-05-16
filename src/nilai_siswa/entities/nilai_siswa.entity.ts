import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Siswa } from '../../siswa/entities/siswa.entity';
import { KurikulumMapel } from '../../kurikulum_mapel/entities/kurikulum_mapel.entity';

@Entity()
@Index(['id_siswa', 'id_kurikulum_mapel'], { unique: true })
export class NilaiSiswa {
  @PrimaryGeneratedColumn()
  id_nilai!: number;

  @Column('float')
  nilai!: number;

  @Column()
  id_siswa!: number;

  @ManyToOne(() => Siswa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_siswa' })
  siswa!: Siswa;

  @Column()
  id_kurikulum_mapel!: number;

  @ManyToOne(() => KurikulumMapel)
  @JoinColumn({ name: 'id_kurikulum_mapel' })
  kurikulum_mapel!: KurikulumMapel;
}
