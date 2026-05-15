import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';

@UseGuards(JwtAuthGuard, new RoleGuard(['superadmin']))
@Controller('superadmin')
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Get('admin')
  getAdmins() {
    return this.superadminService.getAdmins();
  }

  @Post('admin')
  createAdmin(@Body() body: any) {
    return this.superadminService.createAdmin(body);
  }

  @Put('admin/:id')
  updateAdmin(@Param('id') id: string, @Body() body: any) {
    return this.superadminService.updateAdmin(Number(id), body);
  }

  @Delete('admin/:id')
  deleteAdmin(@Param('id') id: string) {
    return this.superadminService.deleteAdmin(Number(id));
  }
}