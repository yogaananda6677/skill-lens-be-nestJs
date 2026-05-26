import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Siswa } from '../../siswa/entities/siswa.entity';
import { RecommendationResult } from './recommendation-result.entity';

@Entity('recommendation_runs')
export class RecommendationRun {
  @PrimaryGeneratedColumn()
  id_recommendation_run!: number;

  @Column({ type: 'int' })
  id_siswa!: number;

  @ManyToOne(() => Siswa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_siswa' })
  siswa!: Siswa;

  /**
   * Kode unik run agar setiap proses SPK menjadi histori baru,
   * bukan menimpa proses lama.
   */
  @Column({ type: 'varchar', length: 80, nullable: true, unique: true })
  run_code!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  payload_hash!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  engine_version!: string | null;

  @Column({ type: 'varchar', length: 40 })
  tujuan_karir!: string;

  @Column({ type: 'varchar', length: 40 })
  jenis_sekolah!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  jurusan_sekolah!: string | null;

  @Column({ type: 'simple-json' })
  payload!: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  raw_response!: any;

  @Column({ type: 'varchar', length: 30, default: 'success' })
  status!: 'success' | 'failed';

  @Column({ type: 'text', nullable: true })
  error_message!: string | null;

  @OneToMany(() => RecommendationResult, (result) => result.run)
  results!: RecommendationResult[];

  @CreateDateColumn()
  created_at!: Date;
}
