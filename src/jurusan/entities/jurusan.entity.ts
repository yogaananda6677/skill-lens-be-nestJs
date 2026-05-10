import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn
} from 'typeorm';

import { Sekolah } from '../../sekolah/entities/sekolah.entity';

@Entity()
export class Jurusan {

  @PrimaryGeneratedColumn()
  id_jurusan!: number;

  @Column()
  nama_jurusan!: string;

  @ManyToOne(() => Sekolah)
  @JoinColumn({ name: 'id_sekolah' })
  sekolah!: Sekolah;
}