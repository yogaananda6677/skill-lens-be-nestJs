import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Siswa } from '../siswa/entities/siswa.entity';
import { PrestasiSiswa } from './entities/prestasi_siswa.entity';
import { PrestasiSiswaController } from './prestasi_siswa.controller';
import { PrestasiSiswaService } from './prestasi_siswa.service';

@Module({
  imports: [TypeOrmModule.forFeature([PrestasiSiswa, Siswa])],
  controllers: [PrestasiSiswaController],
  providers: [PrestasiSiswaService],
  exports: [PrestasiSiswaService],
})
export class PrestasiSiswaModule {}
