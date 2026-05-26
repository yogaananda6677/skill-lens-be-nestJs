import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { SiswaTag } from '../../siswa_tag/entities/siswa_tag.entity';

export type MasterTagTipe = 'minat' | 'bakat' | 'hobi' | 'pengalaman' | 'prestasi';

@Entity('master_tags')
@Unique(['tipe', 'label'])
export class MasterTag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  tipe!: MasterTagTipe;

  @Column({ type: 'varchar', length: 150 })
  label!: string;

  /**
   * mapped_key adalah kunci resmi SPK.
   * Nilainya boleh sama untuk beberapa label, misalnya:
   * - label: Desain UI, mapped_key: ui ux
   * - label: Figma, mapped_key: ui ux
   * Karena itu mapped_key TIDAK boleh dijadikan unique bersama tipe.
   */
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
