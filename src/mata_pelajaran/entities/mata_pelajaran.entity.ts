import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

import { NILAI_AKADEMIK_CATEGORIES } from '../../nilai_siswa/constants/academic-categories';
import type { AcademicCategory } from '../../nilai_siswa/constants/academic-categories';

@Entity()
export class MataPelajaran {
  @PrimaryGeneratedColumn()
  id_mapel!: number;

  @Column()
  nama_mapel!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  kode_mapel!: string | null;

  @Column({
    type: 'enum',
    enum: [...NILAI_AKADEMIK_CATEGORIES],
    nullable: true,
  })
  kategori!: AcademicCategory | null;
}
