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

  /**
   * Kolom lama tetap dipertahankan untuk kompatibilitas tampilan.
   * Engine baru lebih mengutamakan level_key/rank_key/type_key/mapped_key.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  tingkat!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  penyelenggara!: string | null;

  @Column({ type: 'text', nullable: true })
  keterangan!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bukti_url!: string | null;

  /**
   * Kolom terstruktur untuk SPK. Nullable supaya data lama tidak rusak.
   * Referensi isi berasal dari seed:
   * - prestasi_level_weights.level_key
   * - prestasi_rank_weights.rank_key
   * - prestasi_type_weights.type_key
   */
  @Column({ type: 'varchar', length: 80, nullable: true })
  level_key!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  rank_key!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  type_key!: string | null;

  /** mapped_key bidang prestasi yang dikirim ke engine sebagai tag resmi. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  mapped_key!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  kategori_hint!: string | null;
}
