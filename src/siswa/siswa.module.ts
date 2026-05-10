import { Module } from '@nestjs/common';
import { SiswaController } from './siswa.controller';
import { SiswaService } from './siswa.service';
import { Siswa } from './entities/siswa.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';

@Module({
  controllers: [SiswaController],
  providers: [SiswaService],
  imports: [TypeOrmModule.forFeature([Siswa, User])],
})
export class SiswaModule {}
