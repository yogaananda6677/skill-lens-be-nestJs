import { Module } from '@nestjs/common';
import { SiswaTagService } from './siswa_tag.service';
import { SiswaTagController } from './siswa_tag.controller';

@Module({
  controllers: [SiswaTagController],
  providers: [SiswaTagService],
})
export class SiswaTagModule {}
