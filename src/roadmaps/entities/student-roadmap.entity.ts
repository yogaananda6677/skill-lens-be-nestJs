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
import { Siswa } from '../../siswa/entities/siswa.entity';
import { StudentRoadmapProgress } from './student-roadmap-progress.entity';
import { RoadmapStepNote } from './roadmap-step-note.entity';

export type StudentRoadmapStatus = 'aktif' | 'selesai' | 'dibatalkan';

@Entity('student_roadmap')
export class StudentRoadmap {
  @PrimaryGeneratedColumn()
  id_student_roadmap!: number;

  @Column({ type: 'int' })
  id_siswa!: number;

  @ManyToOne(() => Siswa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_siswa' })
  siswa!: Siswa;

  @Column({ type: 'int' })
  id_roadmap!: number;

  @ManyToOne(() => RoadmapMaster)
  @JoinColumn({ name: 'id_roadmap' })
  roadmap!: RoadmapMaster;

  @Column({
    type: 'enum',
    enum: ['aktif', 'selesai', 'dibatalkan'],
    default: 'aktif',
  })
  status!: StudentRoadmapStatus;

  @Column({ type: 'datetime', nullable: true })
  started_at!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completed_at!: Date | null;

  @OneToMany(() => StudentRoadmapProgress, (progress) => progress.studentRoadmap)
  progressRows!: StudentRoadmapProgress[];

  @OneToMany(() => RoadmapStepNote, (note) => note.studentRoadmap)
  stepNotes!: RoadmapStepNote[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
