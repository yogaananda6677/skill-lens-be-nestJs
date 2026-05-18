import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MasterTagsService } from './master_tags.service';
import { MasterTagsController } from './master_tags.controller';
import { MasterTag } from './entities/master_tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MasterTag])],
  controllers: [MasterTagsController],
  providers: [MasterTagsService],
  exports: [MasterTagsService],
})
export class MasterTagsModule {}
