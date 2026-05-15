import { Body, Controller, Get, Post } from '@nestjs/common';
import { SekolahService } from './sekolah.service';

@Controller('sekolah')
export class SekolahController {
  constructor(private readonly sekolahService: SekolahService) {}

  @Get()
  findAll() {
    return this.sekolahService.findAll();
  }

  @Get('approved')
  findApproved() {
    return this.sekolahService.findApproved();
  }

  @Post()
  create(@Body() body: any) {
    return this.sekolahService.create(body);
  }
}
