import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProfileSiswa } from './entities/profile_siswa.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileSiswa])],
  exports: [TypeOrmModule],
})
export class ProfileSiswaModule {}
