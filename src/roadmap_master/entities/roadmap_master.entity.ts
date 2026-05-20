import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RoadmapStep } from '../../roadmap_step/entities/roadmap_step.entity';

export type RoadmapTargetType = 'kuliah' | 'kerja' | 'wirausaha' | 'umum';

@Entity('roadmap_master')
export class RoadmapMaster {
  @PrimaryGeneratedColumn()
  id_roadmap!: number;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  category!: string | null;

  @Column({
    type: 'enum',
    enum: ['kuliah', 'kerja', 'wirausaha', 'umum'],
    default: 'umum',
  })
  target_type!: RoadmapTargetType;

  @Column({ type: 'varchar', length: 120, nullable: true })
  recommended_for!: string | null;

  @Column({ type: 'tinyint', default: 1 })
  is_active!: number;

  @OneToMany(() => RoadmapStep, (step) => step.roadmap)
  steps!: RoadmapStep[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
