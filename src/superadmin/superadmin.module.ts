import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { User } from '../user/entities/user.entity';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Sekolah])],
  controllers: [SuperadminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}
