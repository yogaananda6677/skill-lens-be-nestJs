import { Controller, Get, Query } from '@nestjs/common';
import { MasterTagsService } from './master_tags.service';

@Controller('master-tags')
export class MasterTagsController {
  constructor(private readonly masterTagsService: MasterTagsService) {}

  @Get()
  findAll(@Query('tipe') tipe?: string) {
    return this.masterTagsService.findAll(tipe);
  }
}
