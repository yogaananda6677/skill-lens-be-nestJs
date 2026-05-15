import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JurusanController } from './jurusan.controller';
import { JurusanService } from './jurusan.service';
import { Jurusan } from './entities/jurusan.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';

@Module({
  controllers: [JurusanController],
  providers: [JurusanService],
  imports: [TypeOrmModule.forFeature([Jurusan, Sekolah])],
})
export class JurusanModule {}
