import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SiswaController } from './siswa.controller';
import { SiswaService } from './siswa.service';
import { Siswa } from './entities/siswa.entity';
import { User } from '../user/entities/user.entity';
import { ProfileSiswa } from '../profile_siswa/entities/profile_siswa.entity';
import { NilaiKategoriSiswa } from '../nilai_siswa/entities/nilai_kategori_siswa.entity';
import { MasterTag } from '../master_tags/entities/master_tag.entity';
import { SiswaTag } from '../siswa_tag/entities/siswa_tag.entity';

@Module({
  controllers: [SiswaController],
  providers: [SiswaService],
  imports: [
    TypeOrmModule.forFeature([Siswa, User, ProfileSiswa, NilaiKategoriSiswa, MasterTag, SiswaTag]),
  ],
})
export class SiswaModule {}
