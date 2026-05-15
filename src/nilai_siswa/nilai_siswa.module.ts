import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Jurusan } from '../jurusan/entities/jurusan.entity';
import { KurikulumMapel } from '../kurikulum_mapel/entities/kurikulum_mapel.entity';
import { MataPelajaran } from '../mata_pelajaran/entities/mata_pelajaran.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { Semester } from '../semester/entities/semester.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { User } from '../user/entities/user.entity';
import { NilaiKategoriSiswa } from './entities/nilai_kategori_siswa.entity';
import { NilaiSiswa } from './entities/nilai_siswa.entity';
import { NilaiSiswaController } from './nilai_siswa.controller';
import { NilaiSiswaService } from './nilai_siswa.service';

@Module({
  controllers: [NilaiSiswaController],
  providers: [NilaiSiswaService],
  imports: [
    TypeOrmModule.forFeature([
      NilaiSiswa,
      NilaiKategoriSiswa,
      Siswa,
      User,
      Semester,
      MataPelajaran,
      KurikulumMapel,
      Sekolah,
      Jurusan,
    ]),
  ],
})
export class NilaiSiswaModule {}
