import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  Index,
} from 'typeorm';

import { Sekolah } from '../../sekolah/entities/sekolah.entity';
import { Jurusan } from '../../jurusan/entities/jurusan.entity';
import { Semester } from '../../semester/entities/semester.entity';
import { MataPelajaran } from '../../mata_pelajaran/entities/mata_pelajaran.entity';

@Entity()
@Index(['id_sekolah', 'id_jurusan', 'id_semester', 'id_mapel'], { unique: true })
export class KurikulumMapel {

  @PrimaryGeneratedColumn()
  id_kurikulum_mapel!: number;

  @Column({ type: 'int', nullable: true })
  id_sekolah!: number | null;

  @ManyToOne(() => Sekolah, { nullable: true })
  @JoinColumn({ name: 'id_sekolah' })
  sekolah!: Sekolah | null;

  @Column({ type: 'int', nullable: true })
  id_jurusan!: number | null;

  @ManyToOne(() => Jurusan, { nullable: true })
  @JoinColumn({ name: 'id_jurusan' })
  jurusan!: Jurusan | null;

  @Column()
  id_semester!: number;

  @ManyToOne(() => Semester)
  @JoinColumn({ name: 'id_semester' })
  semester!: Semester;

  @Column()
  id_mapel!: number;

  @ManyToOne(() => MataPelajaran)
  @JoinColumn({ name: 'id_mapel' })
  mata_pelajaran!: MataPelajaran;
}
