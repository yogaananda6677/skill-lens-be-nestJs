import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';

import { Sekolah } from '../../sekolah/entities/sekolah.entity';
import { Jurusan } from '../../jurusan/entities/jurusan.entity';
import { Semester } from '../../semester/entities/semester.entity';
import { MataPelajaran } from '../../mata_pelajaran/entities/mata_pelajaran.entity';

@Entity()
export class KurikulumMapel {

  @PrimaryGeneratedColumn()
  id_kurikulum_mapel!: number;

  @ManyToOne(() => Sekolah)
  @JoinColumn({ name: 'id_sekolah' })
  sekolah!: Sekolah;

  @ManyToOne(() => Jurusan)
  @JoinColumn({ name: 'id_jurusan' })
  jurusan!: Jurusan;

  @ManyToOne(() => Semester)
  @JoinColumn({ name: 'id_semester' })
  semester!: Semester;

  @ManyToOne(() => MataPelajaran)
  @JoinColumn({ name: 'id_mapel' })
  mata_pelajaran!: MataPelajaran;
}