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

  @OneToMany(() => RecommendationResult, (result) => result.run)
  results!: RecommendationResult[];

  @CreateDateColumn()
  created_at!: Date;
}
