import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [SuperadminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}
