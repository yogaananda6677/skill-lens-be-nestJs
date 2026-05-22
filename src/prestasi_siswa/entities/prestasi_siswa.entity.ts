import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Siswa } from '../../siswa/entities/siswa.entity';

@Entity('prestasi_siswa')
export class PrestasiSiswa {
  @PrimaryGeneratedColumn()
  id_prestasi!: number;

  @Column({ type: 'int' })
  id_siswa!: number;

  @ManyToOne(() => Siswa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_siswa' })
  siswa!: Siswa;

  @Column({ type: 'varchar', length: 150 })
  nama_prestasi!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  tahun!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tingkat!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  penyelenggara!: string | null;

  @Column({ type: 'text', nullable: true })
  keterangan!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bukti_url!: string | null;
}