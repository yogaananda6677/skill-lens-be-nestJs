import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../user/entities/user.entity';
import { Semester } from '../../semester/entities/semester.entity';
import { AdminSeeder } from './admin.seed';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Semester,
    ]),
  ],
  providers: [AdminSeeder],
})
export class SeederModule {}