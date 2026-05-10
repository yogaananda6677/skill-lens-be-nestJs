import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn
} from 'typeorm';

import { User } from '../../user/entities/user.entity';

@Entity()
export class Siswa {

  @PrimaryGeneratedColumn()
  id_siswa!: number;

  @Column()
  nisn!: string;

  @Column()
  kelas!: string;

  @Column()
  jurusan!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'id_user' })
  user!: User;
}