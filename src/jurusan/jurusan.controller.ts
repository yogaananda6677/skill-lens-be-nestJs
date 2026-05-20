import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';
import { JurusanService } from './jurusan.service';

@Controller('jurusan')
export class JurusanController {
  constructor(private readonly jurusanService: JurusanService) {}

  @Get()
  findAll(@Query('sekolahId') sekolahId?: string) {
    return this.jurusanService.findAll(
      sekolahId ? Number(sekolahId) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['superadmin', 'admin', 'admin_sekolah', 'guru']))
  @Post()
  create(@Body() body: any) {
    return this.jurusanService.create(body);
  }
}
