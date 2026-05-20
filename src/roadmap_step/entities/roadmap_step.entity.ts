import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RoadmapMaster } from '../../roadmap_master/entities/roadmap_master.entity';
import { RoadmapStepDetail } from '../../roadmap_step_detail/entities/roadmap_step_detail.entity';

@Entity('roadmap_step')
export class RoadmapStep {
  @PrimaryGeneratedColumn()
  id_roadmap_step!: number;

  @Column({ type: 'int' })
  id_roadmap!: number;

  @ManyToOne(() => RoadmapMaster, (roadmap) => roadmap.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_roadmap' })
  roadmap!: RoadmapMaster;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'int', default: 1 })
  step_order!: number;

  @Column({ type: 'varchar', length: 80, nullable: true })
  estimated_duration!: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  output_target!: string | null;

  @Column({ type: 'tinyint', default: 1 })
  is_active!: number;

  @OneToMany(() => RoadmapStepDetail, (detail) => detail.step)
  details!: RoadmapStepDetail[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
