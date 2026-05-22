import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';
import { CreatePrestasiSiswaDto } from './dto/create-prestasi_siswa.dto';
import { UpdatePrestasiSiswaDto } from './dto/update-prestasi_siswa.dto';
import { PrestasiSiswaService } from './prestasi_siswa.service';

@UseGuards(
  JwtAuthGuard,
  new RoleGuard(['siswa', 'guru', 'admin_sekolah', 'admin', 'superadmin']),
)
@Controller('prestasi-siswa')
export class PrestasiSiswaController {
  constructor(private readonly prestasiSiswaService: PrestasiSiswaService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreatePrestasiSiswaDto) {
    return this.prestasiSiswaService.create(dto, req.user);
  }

  @Get()
  findAll(@Req() req: any, @Query('id_siswa') idSiswa?: string) {
    return this.prestasiSiswaService.findAll(req.user, Number(idSiswa || 0) || undefined);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.prestasiSiswaService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrestasiSiswaDto,
  ) {
    return this.prestasiSiswaService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.prestasiSiswaService.remove(id, req.user);
  }
}
