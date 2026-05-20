import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';
import { SekolahService } from './sekolah.service';

@Controller('sekolah')
export class SekolahController {
  constructor(private readonly sekolahService: SekolahService) {}

  @UseGuards(JwtAuthGuard, new RoleGuard(['superadmin', 'admin']))
  @Get()
  findAll() {
    return this.sekolahService.findAll();
  }

  @Get('approved')
  findApproved() {
    return this.sekolahService.findApproved();
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['superadmin', 'admin']))
  @Post()
  create(@Body() body: any) {
    return this.sekolahService.create(body);
  }
}
