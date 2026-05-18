import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { SiswaTag } from '../../siswa_tag/entities/siswa_tag.entity';

export type MasterTagTipe = 'minat' | 'bakat' | 'hobi' | 'pengalaman';

@Entity('master_tags')
@Unique(['tipe', 'mapped_key'])
export class MasterTag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  tipe!: MasterTagTipe;

  @Column({ type: 'varchar', length: 150 })
  label!: string;

  @Column({ type: 'varchar', length: 120 })
  mapped_key!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  kategori_hint!: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @Column({ type: 'tinyint', default: 1 })
  is_active!: number;

  @OneToMany(() => SiswaTag, (siswaTag) => siswaTag.masterTag)
  siswaTags!: SiswaTag[];
}
