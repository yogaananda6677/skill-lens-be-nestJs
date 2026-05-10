import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';

import { User } from '../../user/entities/user.entity';

@Entity()
export class Admin {

  @PrimaryGeneratedColumn()
  id_admin!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'id_user' })
  user!: User;
}