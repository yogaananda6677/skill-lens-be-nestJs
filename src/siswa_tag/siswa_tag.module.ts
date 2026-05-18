import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SiswaTagService } from './siswa_tag.service';
import { SiswaTagController } from './siswa_tag.controller';
import { SiswaTag } from './entities/siswa_tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SiswaTag])],
  controllers: [SiswaTagController],
  providers: [SiswaTagService],
  exports: [TypeOrmModule],
})
export class SiswaTagModule {}
