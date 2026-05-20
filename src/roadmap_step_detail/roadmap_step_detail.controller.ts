import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { RoadmapStepDetailService } from './roadmap_step_detail.service';
import { CreateRoadmapStepDetailDto } from './dto/create-roadmap_step_detail.dto';
import { UpdateRoadmapStepDetailDto } from './dto/update-roadmap_step_detail.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';

@UseGuards(JwtAuthGuard, new RoleGuard(['superadmin', 'admin', 'admin_sekolah']))
@Controller('roadmap-step-detail')
export class RoadmapStepDetailController {
  constructor(private readonly roadmapStepDetailService: RoadmapStepDetailService) {}

  @Post()
  create(@Body() dto: CreateRoadmapStepDetailDto) {
    return this.roadmapStepDetailService.create(dto);
  }

  @Get()
  findAll() {
    return this.roadmapStepDetailService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roadmapStepDetailService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoadmapStepDetailDto) {
    return this.roadmapStepDetailService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roadmapStepDetailService.remove(id);
  }
}
