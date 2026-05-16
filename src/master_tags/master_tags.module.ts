import { Module } from '@nestjs/common';
import { MasterTagsService } from './master_tags.service';
import { MasterTagsController } from './master_tags.controller';

@Module({
  controllers: [MasterTagsController],
  providers: [MasterTagsService],
})
export class MasterTagsModule {}
