import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../user/entities/user.entity';
import { AdminSeeder } from './admin.seed';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AdminSeeder],
})
export class SeederModule {}
