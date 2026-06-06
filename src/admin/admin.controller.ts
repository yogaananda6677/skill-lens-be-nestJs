import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
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

  @Put('verifikasi/:id/reject')
  rejectSekolah(@Param('id') id: string, @Body() body: any) {
    return this.adminService.tolakSekolah(Number(id), body?.reason ?? body?.alasan);
  }

  @Put('settings/roadmap-count')
  updateRoadmapCount(@Body() body: any) {
    return this.adminService.updateRoadmapCount(body?.count ?? body?.top_n ?? body?.jumlah);
  }

  @Put('settings/roadmap-step-limit')
  updateRoadmapStepLimit(@Body() body: any) {
    return this.adminService.updateRoadmapStepLimit(body?.count ?? body?.limit ?? body?.jumlah_tahap ?? body?.step_limit);
  }

  @Get('sekolah')
  schools() {
    return this.adminService.schools();
  }

  @Delete('sekolah/:id')
  deleteSchool(@Param('id') id: string) {
    return this.adminService.deleteSchool(Number(id));
  }
}
