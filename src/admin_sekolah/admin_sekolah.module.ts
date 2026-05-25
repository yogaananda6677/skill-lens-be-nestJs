import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminSekolahController } from './admin_sekolah.controller';
import { AdminSekolahService } from './admin_sekolah.service';
import { MataPelajaranModule } from '../mata_pelajaran/mata_pelajaran.module';

import { User } from '../user/entities/user.entity';
import { Guru } from '../guru/entities/guru.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { Jurusan } from '../jurusan/entities/jurusan.entity';
import { SiswaModule } from '../siswa/siswa.module';
import { NilaiSiswaModule } from '../nilai_siswa/nilai_siswa.module';
import { Siswa } from '../siswa/entities/siswa.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([User, Guru, Sekolah, Jurusan, Siswa]),
    SiswaModule,
    NilaiSiswaModule,
    MataPelajaranModule,
  ],
  controllers: [AdminSekolahController],
  providers: [AdminSekolahService],
  exports: [AdminSekolahService],
})
export class AdminSekolahModule {}