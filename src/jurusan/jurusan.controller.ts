import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { JurusanService } from './jurusan.service';

@Controller('jurusan')
export class JurusanController {
  constructor(private readonly jurusanService: JurusanService) {}

  @Get()
  findAll(@Query('sekolahId') sekolahId?: string) {
    return this.jurusanService.findAll(sekolahId ? Number(sekolahId) : undefined);
  }

  @Post()
  create(@Body() body: any) {
    return this.jurusanService.create(body);
  }
}
