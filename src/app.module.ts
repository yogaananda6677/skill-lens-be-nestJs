import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminModule } from './admin/admin.module';
import { AdminSekolahModule } from './admin_sekolah/admin_sekolah.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SeederModule } from './database/seeders/seeder.module';
import { GuruModule } from './guru/guru.module';
import { JurusanModule } from './jurusan/jurusan.module';
import { KurikulumMapelModule } from './kurikulum_mapel/kurikulum_mapel.module';
import { MasterTagsModule } from './master_tags/master_tags.module';
import { MataPelajaranModule } from './mata_pelajaran/mata_pelajaran.module';
import { NilaiSiswaModule } from './nilai_siswa/nilai_siswa.module';
import { ProfileSiswaModule } from './profile_siswa/profile_siswa.module';
import { RoadmapMasterModule } from './roadmap_master/roadmap_master.module';
import { RoadmapStepModule } from './roadmap_step/roadmap_step.module';
import { RoadmapStepDetailModule } from './roadmap_step_detail/roadmap_step_detail.module';
import { RoadmapsModule } from './roadmaps/roadmaps.module';
import { SekolahModule } from './sekolah/sekolah.module';
import { SemesterModule } from './semester/semester.module';
import { SiswaModule } from './siswa/siswa.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { UserModule } from './user/user.module';
import { PrestasiSiswaModule } from './prestasi_siswa/prestasi_siswa.module';
import { AiModule } from './ai/ai.module';
import { SchoolLookupModule } from './school-lookup/school-lookup.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_DATABASE ?? 'skilllens_db',
      autoLoadEntities: true,
      synchronize: process.env.TYPEORM_SYNC === 'true' && process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    UserModule,
    AdminModule,
    AdminSekolahModule,
    SuperadminModule,
    GuruModule,
    SiswaModule,
    SekolahModule,
    JurusanModule,
    SemesterModule,
    MataPelajaranModule,
    KurikulumMapelModule,
    NilaiSiswaModule,
    ProfileSiswaModule,
    MasterTagsModule,
    RoadmapMasterModule,
    RoadmapStepModule,
    RoadmapStepDetailModule,
    RoadmapsModule,
    SeederModule,
    PrestasiSiswaModule,
    AiModule,
    SchoolLookupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
