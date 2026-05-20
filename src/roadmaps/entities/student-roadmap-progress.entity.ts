import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RoadmapStepDetail } from '../../roadmap_step_detail/entities/roadmap_step_detail.entity';
import { StudentRoadmap } from './student-roadmap.entity';

export type RoadmapProgressStatus = 'belum' | 'proses' | 'selesai';

@Entity('student_roadmap_progress')
@Index(['id_student_roadmap', 'id_roadmap_step_detail'], { unique: true })
export class StudentRoadmapProgress {
  @PrimaryGeneratedColumn()
  id_student_roadmap_progress!: number;

  @Column({ type: 'int' })
  id_student_roadmap!: number;

  @ManyToOne(() => StudentRoadmap, (roadmap) => roadmap.progressRows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_student_roadmap' })
  studentRoadmap!: StudentRoadmap;

  @Column({ type: 'int' })
  id_roadmap_step_detail!: number;

  @ManyToOne(() => RoadmapStepDetail)
  @JoinColumn({ name: 'id_roadmap_step_detail' })
  detail!: RoadmapStepDetail;

  @Column({
    type: 'enum',
    enum: ['belum', 'proses', 'selesai'],
    default: 'belum',
  })
  status!: RoadmapProgressStatus;

  @Column({ type: 'text', nullable: true })
  progress_note!: string | null;

  @Column({ type: 'datetime', nullable: true })
  completed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
