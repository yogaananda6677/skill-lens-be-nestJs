import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('sekolah')
export class Sekolah {
  @PrimaryGeneratedColumn()
  id_sekolah!: number;

  @Column({ type: 'varchar', length: 150 })
  nama_sekolah!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  npsn!: string | null;

  @Column({ type: 'text', nullable: true })
  alamat!: string | null;

  @Column({ type: 'varchar', length: 25, nullable: true })
  no_hp_sekolah!: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved'],
    default: 'pending',
  })
  status_verifikasi!: 'pending' | 'approved';

  @Column({
    type: 'enum',
    enum: ['SMA', 'SMK'],
    nullable: true,
  })
  jenis_sekolah!: 'SMA' | 'SMK' | null;
}
