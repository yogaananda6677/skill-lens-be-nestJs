import { Module } from '@nestjs/common';
import { JurusanController } from './jurusan.controller';
import { JurusanService } from './jurusan.service';
import { Jurusan } from './entities/jurusan.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [JurusanController],
  providers: [JurusanService],
  imports: [TypeOrmModule.forFeature([Jurusan])],
})
export class JurusanModule {}
