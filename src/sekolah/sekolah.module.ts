import { Module } from '@nestjs/common';
import { SekolahController } from './sekolah.controller';
import { SekolahService } from './sekolah.service';
import { Sekolah } from './entities/sekolah.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [SekolahController],
  providers: [SekolahService],
  imports: [TypeOrmModule.forFeature([Sekolah])],
})
export class SekolahModule {}
