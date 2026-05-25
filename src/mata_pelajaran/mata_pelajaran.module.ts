import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MataPelajaran } from './entities/mata_pelajaran.entity';
import { MataPelajaranService } from './mata_pelajaran.service';

@Module({
  imports: [TypeOrmModule.forFeature([MataPelajaran])],
  providers: [MataPelajaranService],
  exports: [MataPelajaranService], 
})
export class MataPelajaranModule {}