import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { GuruModule } from './guru/guru.module';
import { SiswaModule } from './siswa/siswa.module';
import { SekolahModule } from './sekolah/sekolah.module';
import { JurusanModule } from './jurusan/jurusan.module';
import { SemesterModule } from './semester/semester.module';
import { MataPelajaranModule } from './mata_pelajaran/mata_pelajaran.module';
import { KurikulumMapelModule } from './kurikulum_mapel/kurikulum_mapel.module';
import { NilaiSiswaModule } from './nilai_siswa/nilai_siswa.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { SeederModule } from './database/seeders/seeder.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { ProfileSiswaModule } from './profile_siswa/profile_siswa.module';
import { MasterTagsController } from './master_tags/master_tags.controller';
import { MasterTagsService } from './master_tags/master_tags.service';
import { MasterTagsModule } from './master_tags/master_tags.module';
import { SiswaTagModule } from './siswa_tag/siswa_tag.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? 'root123',
      database: process.env.DB_DATABASE ?? 'skilllens_db',
      autoLoadEntities: true,
      synchronize: true,
    }),

    UserModule,
    AdminModule,
    GuruModule,
    SiswaModule,
    SekolahModule,
    JurusanModule,
    SemesterModule,
    MataPelajaranModule,
    KurikulumMapelModule,
    NilaiSiswaModule,
    AuthModule,
    SeederModule,
    SuperadminModule,
    ProfileSiswaModule,
    MasterTagsModule,
    SiswaTagModule,
    
  ],
  controllers: [MasterTagsController],
  providers: [MasterTagsService],
  
})
export class AppModule {}