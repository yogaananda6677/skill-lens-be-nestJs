import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MasterTagsService } from './master_tags.service';
import { CreateMasterTagDto } from './dto/create-master_tag.dto';
import { UpdateMasterTagDto } from './dto/update-master_tag.dto';

@Controller('master-tags')
export class MasterTagsController {
  constructor(private readonly masterTagsService: MasterTagsService) {}

  @Post()
  create(@Body() createMasterTagDto: CreateMasterTagDto) {
    return this.masterTagsService.create(createMasterTagDto);
  }

  @Get()
  findAll() {
    return this.masterTagsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.masterTagsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMasterTagDto: UpdateMasterTagDto) {
    return this.masterTagsService.update(+id, updateMasterTagDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.masterTagsService.remove(+id);
  }
}
