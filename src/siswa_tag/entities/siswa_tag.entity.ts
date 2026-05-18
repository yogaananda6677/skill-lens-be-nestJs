import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { MasterTag } from '../../master_tags/entities/master_tag.entity';
import { ProfileSiswa } from '../../profile_siswa/entities/profile_siswa.entity';

@Entity('siswa_tag')
@Unique(['id_profile_siswa', 'id_master_tag'])
export class SiswaTag {
  @PrimaryGeneratedColumn()
  id_siswa_tag!: number;

  @Column({ type: 'int' })
  id_profile_siswa!: number;

  @Column({ type: 'int' })
  id_master_tag!: number;

  @ManyToOne(() => ProfileSiswa, (profile) => profile.siswaTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_profile_siswa' })
  profileSiswa!: ProfileSiswa;

  @ManyToOne(() => MasterTag, (masterTag) => masterTag.siswaTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_master_tag', referencedColumnName: 'id' })
  masterTag!: MasterTag;
}
