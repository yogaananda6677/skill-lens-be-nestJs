import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Jurusan } from '../jurusan/entities/jurusan.entity';
import { NilaiKategoriSiswa } from '../nilai_siswa/entities/nilai_kategori_siswa.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { Guru } from './entities/guru.entity';
import { GuidanceNote } from './entities/guidance-note.entity';
import { GuruController } from './guru.controller';
import { GuruService } from './guru.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Guru,
      GuidanceNote,
      Siswa,
      NilaiKategoriSiswa,
      Sekolah,
      Jurusan,
    ]),
  ],
  controllers: [GuruController],
  providers: [GuruService],
})
export class GuruModule {}
