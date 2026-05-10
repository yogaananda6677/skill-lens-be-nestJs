import { Module } from '@nestjs/common';
import { MataPelajaranController } from './mata_pelajaran.controller';
import { MataPelajaranService } from './mata_pelajaran.service';
import { MataPelajaran } from './entities/mata_pelajaran.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [MataPelajaranController],
  providers: [MataPelajaranService],
  imports: [TypeOrmModule.forFeature([MataPelajaran])],
})
export class MataPelajaranModule {}
