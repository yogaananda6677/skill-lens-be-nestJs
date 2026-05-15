import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';

import { User } from '../../user/entities/user.entity';
import { Sekolah } from '../../sekolah/entities/sekolah.entity';

@Entity('guru')
export class Guru {
  @PrimaryGeneratedColumn()
  id_guru!: number;

  @Column({ type: 'varchar', length: 50 })
  nip!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  jabatan!: string | null;

  @Column({ type: 'int', nullable: true })
  id_sekolah!: number | null;

  @ManyToOne(() => Sekolah, { nullable: true })
  @JoinColumn({ name: 'id_sekolah' })
  sekolah!: Sekolah | null;

  @OneToOne(() => User)
  @JoinColumn({ name: 'id_user' })
  user!: User;
}
