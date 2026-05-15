import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuruController } from './guru.controller';
import { GuruService } from './guru.service';
import { Guru } from './entities/guru.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { NilaiKategoriSiswa } from '../nilai_siswa/entities/nilai_kategori_siswa.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { Jurusan } from '../jurusan/entities/jurusan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Guru, Siswa, NilaiKategoriSiswa, Sekolah, Jurusan])],
  controllers: [GuruController],
  providers: [GuruService],
})
export class GuruModule {}
