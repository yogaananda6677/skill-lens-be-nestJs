import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Guru } from '../guru/entities/guru.entity';
import { MasterTag } from '../master_tags/entities/master_tag.entity';
import { NilaiKategoriSiswa } from '../nilai_siswa/entities/nilai_kategori_siswa.entity';
import { ProfileSiswa } from '../profile_siswa/entities/profile_siswa.entity';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { SiswaTag } from '../siswa_tag/entities/siswa_tag.entity';
import { User } from '../user/entities/user.entity';
import { Siswa } from './entities/siswa.entity';
import { SiswaController } from './siswa.controller';
import { SiswaImportService } from './services/siswa-import.service';
import { SiswaProfileService } from './services/siswa-profile.service';
import { SiswaSpkService } from './services/siswa-spk.service';
import { SiswaService } from './siswa.service';
import { PrestasiSiswa } from '../prestasi_siswa/entities/prestasi_siswa.entity';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [
    RecommendationsModule,
    AiModule,
    TypeOrmModule.forFeature([
      Siswa,
      User,
      Guru,
      ProfileSiswa,
      NilaiKategoriSiswa,
      MasterTag,
      SiswaTag,
      PrestasiSiswa,
    ]),
  ],
  controllers: [SiswaController],
  providers: [
    SiswaService,
    SiswaProfileService,
    SiswaSpkService,
    SiswaImportService,
  ],
  exports: [SiswaService],
})
export class SiswaModule {}