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
import { Jurusan } from '../../jurusan/entities/jurusan.entity';

@Entity('siswa')
export class Siswa {
  @PrimaryGeneratedColumn()
  id_siswa!: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  nisn!: string;

  @Column({ type: 'varchar', length: 30 })
  kelas!: string;

  @Column({ type: 'varchar', length: 120 })
  jurusan!: string;

  @Column({ type: 'int', nullable: true })
  id_sekolah!: number | null;

  @ManyToOne(() => Sekolah, { nullable: true })
  @JoinColumn({ name: 'id_sekolah' })
  sekolah!: Sekolah | null;

  @Column({ type: 'int', nullable: true })
  id_jurusan!: number | null;

  @ManyToOne(() => Jurusan, { nullable: true })
  @JoinColumn({ name: 'id_jurusan' })
  jurusan_detail!: Jurusan | null;

  @OneToOne(() => User)
  @JoinColumn({ name: 'id_user' })
  user!: User;
}
