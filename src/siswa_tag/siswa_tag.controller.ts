import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SiswaTagService } from './siswa_tag.service';
import { CreateSiswaTagDto } from './dto/create-siswa_tag.dto';
import { UpdateSiswaTagDto } from './dto/update-siswa_tag.dto';

@Controller('siswa-tag')
export class SiswaTagController {
  constructor(private readonly siswaTagService: SiswaTagService) {}

  @Post()
  create(@Body() createSiswaTagDto: CreateSiswaTagDto) {
    return this.siswaTagService.create(createSiswaTagDto);
  }

  @Get()
  findAll() {
    return this.siswaTagService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.siswaTagService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSiswaTagDto: UpdateSiswaTagDto) {
    return this.siswaTagService.update(+id, updateSiswaTagDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.siswaTagService.remove(+id);
  }
}
