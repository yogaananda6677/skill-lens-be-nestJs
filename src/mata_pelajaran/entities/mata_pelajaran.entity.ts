import {
  Entity,
  PrimaryGeneratedColumn,
  Column
} from 'typeorm';

@Entity()
export class MataPelajaran {

  @PrimaryGeneratedColumn()
  id_mapel!: number;

  @Column()
  nama_mapel!: string;
}