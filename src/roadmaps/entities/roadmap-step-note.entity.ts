import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Guru } from '../../guru/entities/guru.entity';
import { RoadmapStep } from '../../roadmap_step/entities/roadmap_step.entity';
import { StudentRoadmap } from './student-roadmap.entity';

@Entity('roadmap_step_notes')
export class RoadmapStepNote {
  @PrimaryGeneratedColumn()
  id_roadmap_step_note!: number;

  @Column({ type: 'int' })
  id_student_roadmap!: number;

  @ManyToOne(() => StudentRoadmap, (roadmap) => roadmap.stepNotes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_student_roadmap' })
  studentRoadmap!: StudentRoadmap;

  @Column({ type: 'int' })
  id_roadmap_step!: number;

  @ManyToOne(() => RoadmapStep)
  @JoinColumn({ name: 'id_roadmap_step' })
  step!: RoadmapStep;

  @Column({ type: 'int' })
  id_guru!: number;

  @ManyToOne(() => Guru)
  @JoinColumn({ name: 'id_guru' })
  guru!: Guru;

  @Column({ type: 'varchar', length: 160, nullable: true })
  title!: string | null;

  @Column({ type: 'text' })
  note!: string;

  @Column({ type: 'text', nullable: true })
  follow_up!: string | null;

  @Column({ type: 'tinyint', default: 1 })
  visible_to_student!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
