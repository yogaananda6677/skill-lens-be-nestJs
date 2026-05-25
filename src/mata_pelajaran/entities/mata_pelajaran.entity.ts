import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Jurusan } from '../../jurusan/entities/jurusan.entity';
import { Sekolah } from '../../sekolah/entities/sekolah.entity';

import { NILAI_AKADEMIK_CATEGORIES } from '../../nilai_siswa/constants/academic-categories';

import type { AcademicCategory } from '../../nilai_siswa/constants/academic-categories';

@Entity('mata_pelajaran')
@Index(['nama_mapel', 'semester', 'id_jurusan', 'id_sekolah'])
export class MataPelajaran {
  @PrimaryGeneratedColumn()
  id_mapel!: number;

  @Column({
    type: 'varchar',
    length: 100,
  })
  nama_mapel!: string;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  kode_mapel!: string | null;

  @Column({
    type: 'enum',
    enum: [...NILAI_AKADEMIK_CATEGORIES],
    nullable: true,
  })
  kategori!: AcademicCategory | null;

  @Column({
    type: 'enum',
    enum: ['umum', 'jurusan'],
    default: 'umum',
  })
  tipe_mapel!: 'umum' | 'jurusan';

  @Column({
    type: 'int',
    nullable: true,
  })
  semester!: number | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  id_jurusan!: number | null;

  @ManyToOne(() => Jurusan, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'id_jurusan',
  })
  jurusan!: Jurusan | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  id_sekolah!: number | null;

  @ManyToOne(() => Sekolah, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'id_sekolah',
  })
  sekolah!: Sekolah | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  is_default!: boolean;
}