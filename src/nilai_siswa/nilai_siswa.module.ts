import { Module } from '@nestjs/common';
import { NilaiSiswaController } from './nilai_siswa.controller';
import { NilaiSiswaService } from './nilai_siswa.service';
import { NilaiSiswa } from './entities/nilai_siswa.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [NilaiSiswaController],
  providers: [NilaiSiswaService],
  imports: [TypeOrmModule.forFeature([NilaiSiswa])],
})
export class NilaiSiswaModule {}
