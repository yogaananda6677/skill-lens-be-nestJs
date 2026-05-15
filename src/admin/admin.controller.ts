import { Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';

@UseGuards(JwtAuthGuard, new RoleGuard(['superadmin', 'admin']))
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get('verifikasi')
  verifications() {
    return this.adminService.verifications();
  }

  @Put('verifikasi/:id')
  verifikasi(@Param('id') id: string) {
    return this.adminService.verifikasiSekolah(Number(id));
  }

  @Get('sekolah')
  schools() {
    return this.adminService.schools();
  }
}
