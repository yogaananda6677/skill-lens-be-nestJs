import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RoadmapStep } from '../../roadmap_step/entities/roadmap_step.entity';

@Entity('roadmap_step_detail')
export class RoadmapStepDetail {
  @PrimaryGeneratedColumn()
  id_roadmap_step_detail!: number;

  @Column({ type: 'int' })
  id_roadmap_step!: number;

  @ManyToOne(() => RoadmapStep, (step) => step.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_roadmap_step' })
  step!: RoadmapStep;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  reference_link!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  reference_type!: string | null;

  @Column({ type: 'int', default: 1 })
  detail_order!: number;

  @Column({ type: 'tinyint', default: 1 })
  is_active!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
