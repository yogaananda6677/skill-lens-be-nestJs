import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { MataPelajaranService } from './mata_pelajaran.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';

@Controller('mata-pelajaran')
@UseGuards(JwtAuthGuard, new RoleGuard(['superadmin', 'admin']))
export class MataPelajaranController {
  constructor(private readonly mapelService: MataPelajaranService) {}

  @Get()
  findAll() {
    return this.mapelService.findAllBySekolah(); // untuk superadmin lihat semua
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mapelService.findOne(+id);
  }

  @Post()
  create(@Body() createDto: any) {
    return this.mapelService.create(createDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.mapelService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mapelService.delete(+id);
  }
}