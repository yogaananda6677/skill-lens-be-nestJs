import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Jurusan } from '../jurusan/entities/jurusan.entity';
import { NilaiKategoriSiswa } from '../nilai_siswa/entities/nilai_kategori_siswa.entity';
import { NilaiSiswa } from '../nilai_siswa/entities/nilai_siswa.entity';
import { RecommendationRun } from '../recommendations/entities/recommendation-run.entity';
import { RecommendationResult } from '../recommendations/entities/recommendation-result.entity';
import { StudentRoadmap } from '../roadmaps/entities/student-roadmap.entity';
import { StudentRoadmapProgress } from '../roadmaps/entities/student-roadmap-progress.entity';
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
      NilaiSiswa,
      RecommendationRun,
      RecommendationResult,
      StudentRoadmap,
      StudentRoadmapProgress,
      Sekolah,
      Jurusan,
    ]),
  ],
  controllers: [GuruController],
  providers: [GuruService],
})
export class GuruModule {}
