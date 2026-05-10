import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn
} from 'typeorm';

import { User } from '../../user/entities/user.entity';

@Entity()
export class Guru {

  @PrimaryGeneratedColumn()
  id_guru!: number;

  @Column()
  nip!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'id_user' })
  user!: User;
}