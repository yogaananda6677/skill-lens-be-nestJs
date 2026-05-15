import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../user/entities/user.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { Siswa } from '../siswa/entities/siswa.entity';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [TypeOrmModule.forFeature([User, Sekolah, Siswa])],
})
export class AdminModule {}
