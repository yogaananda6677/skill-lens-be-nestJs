import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { MasterTag } from '../../master_tags/entities/master_tag.entity';
import { ProfileSiswa } from '../../profile_siswa/entities/profile_siswa.entity';

@Entity("siswa_tag")
export class SiswaTag {
    @PrimaryGeneratedColumn()
      id_siswa_tag!: number;
    
      @ManyToOne(() => MasterTag, { nullable: true })
      @JoinColumn({ name: 'id_master_tag' })
      masterTag!: MasterTag | null;
    

    
      @ManyToOne(() => ProfileSiswa, { nullable: true })
      @JoinColumn({ name: 'id_profile_siswa' })
      profileSiswa!: ProfileSiswa | null;
}
