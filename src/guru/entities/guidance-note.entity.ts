import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Guru } from './guru.entity';
import { Siswa } from '../../siswa/entities/siswa.entity';

export type GuidanceNoteStatus = 'draft' | 'aktif' | 'selesai';

@Entity('guidance_notes')
export class GuidanceNote {
  @PrimaryGeneratedColumn()
  id_guidance_note!: number;

  @Column({ type: 'int' })
  id_siswa!: number;

  @ManyToOne(() => Siswa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_siswa' })
  siswa!: Siswa;

  @Column({ type: 'int' })
  id_guru!: number;

  @ManyToOne(() => Guru)
  @JoinColumn({ name: 'id_guru' })
  guru!: Guru;

  @Column({ type: 'varchar', length: 160 })
  topic!: string;

  @Column({ type: 'text' })
  note!: string;

  @Column({ type: 'text', nullable: true })
  follow_up!: string | null;

  @Column({
    type: 'enum',
    enum: ['draft', 'aktif', 'selesai'],
    default: 'aktif',
  })
  status!: GuidanceNoteStatus;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
