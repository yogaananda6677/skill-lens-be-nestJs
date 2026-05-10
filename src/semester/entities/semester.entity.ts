import {
  Entity,
  PrimaryGeneratedColumn,
  Column
} from 'typeorm';

@Entity()
export class Semester {

  @PrimaryGeneratedColumn()
  id_semester!: number;

  @Column()
  nama_semester!: string;

  @Column()
  tahun_ajaran!: string;
}