import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Sekolah } from '../../sekolah/entities/sekolah.entity';

@Entity('jurusan')
export class Jurusan {
  @PrimaryGeneratedColumn()
  id_jurusan!: number;

  @Column({ type: 'varchar', length: 120 })
  nama_jurusan!: string;

  @Column({ type: 'int' })
  id_sekolah!: number;

  @ManyToOne(() => Sekolah)
  @JoinColumn({ name: 'id_sekolah' })
  sekolah!: Sekolah;
}
