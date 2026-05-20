import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { RoadmapMasterService } from './roadmap_master.service';
import { CreateRoadmapMasterDto } from './dto/create-roadmap_master.dto';
import { UpdateRoadmapMasterDto } from './dto/update-roadmap_master.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';

@Controller('roadmap-master')
export class RoadmapMasterController {
  constructor(private readonly roadmapMasterService: RoadmapMasterService) {}

  @UseGuards(JwtAuthGuard, new RoleGuard(['superadmin', 'admin', 'admin_sekolah']))
  @Post()
  create(@Body() dto: CreateRoadmapMasterDto) {
    return this.roadmapMasterService.create(dto);
  }

  @Get()
  findAll() {
    return this.roadmapMasterService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roadmapMasterService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['superadmin', 'admin', 'admin_sekolah']))
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoadmapMasterDto) {
    return this.roadmapMasterService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['superadmin', 'admin', 'admin_sekolah']))
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roadmapMasterService.remove(id);
  }
}
