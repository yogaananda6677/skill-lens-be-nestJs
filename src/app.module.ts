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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root123',
      database: 'skilllens_db',
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
