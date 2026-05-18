import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
// Sesuaikan path import SiswaTag dengan struktur project kamu.
import { SiswaTag } from '../siswa_tag/entities/siswa_tag.entity';

@Entity('master_tags')
@Index('uq_master_tags', ['tipe', 'label', 'mapped_key'], { unique: true })
@Index('idx_master_tags_tipe', ['tipe', 'is_active', 'sort_order'])
@Index('idx_master_tags_key', ['mapped_key'])
export class MasterTags {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 30 })
  tipe!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'varchar', length: 120 })
  mapped_key!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  kategori_hint!: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @Column({ type: 'tinyint', default: 1 })
  is_active!: number;

  @OneToMany(() => SiswaTag, (siswaTag) => siswaTag.masterTag)
  siswaTags!: SiswaTag[];
}
