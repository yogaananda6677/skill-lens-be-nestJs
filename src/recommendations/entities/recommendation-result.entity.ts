import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { RecommendationRun } from './recommendation-run.entity';

@Entity('recommendation_results')
export class RecommendationResult {
  @PrimaryGeneratedColumn()
  id_recommendation_result!: number;

  @Column({ type: 'int' })
  id_recommendation_run!: number;

  @ManyToOne(() => RecommendationRun, (run) => run.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_recommendation_run' })
  run!: RecommendationRun;

  @Column({ type: 'int', default: 0 })
  rank_order!: number;

  @Column({ type: 'varchar', length: 180 })
  alternative_name!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  alternative_type!: string | null;

  @Column({ type: 'float', default: 0 })
  score!: number;

  @Column({ type: 'simple-json', nullable: true })
  detail!: any;

  @CreateDateColumn()
  created_at!: Date;
}
