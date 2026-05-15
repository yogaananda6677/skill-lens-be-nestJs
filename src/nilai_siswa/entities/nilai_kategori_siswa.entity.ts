import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Siswa } from '../../siswa/entities/siswa.entity';
import { NILAI_AKADEMIK_CATEGORIES } from '../constants/academic-categories';
import type { AcademicCategory } from '../constants/academic-categories';

@Entity()
@Index(['id_siswa', 'kategori'], { unique: true })
export class NilaiKategoriSiswa {
  @PrimaryGeneratedColumn()
  id_nilai_kategori!: number;

  @Column()
  id_siswa!: number;

  @ManyToOne(() => Siswa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_siswa' })
  siswa!: Siswa;

  @Column({
    type: 'enum',
    enum: [...NILAI_AKADEMIK_CATEGORIES],
  })
  kategori!: AcademicCategory;

  @Column('float', { default: 0 })
  nilai!: number;

  @Column('float', { default: 0 })
  total_bobot_terpakai!: number;

  @Column({ default: 0 })
  jumlah_mapel_terpakai!: number;

  @Column({ type: 'simple-json', nullable: true })
  rincian_semester!: Array<{
    semester: number;
    bobot: number;
    rata_rata: number;
    jumlah_mapel: number;
    mapel: string[];
  }> | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
