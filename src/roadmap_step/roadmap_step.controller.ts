import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { RoadmapStepService } from './roadmap_step.service';
import { CreateRoadmapStepDto } from './dto/create-roadmap_step.dto';
import { UpdateRoadmapStepDto } from './dto/update-roadmap_step.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';

@UseGuards(JwtAuthGuard, new RoleGuard(['superadmin', 'admin', 'admin_sekolah']))
@Controller('roadmap-step')
export class RoadmapStepController {
  constructor(private readonly roadmapStepService: RoadmapStepService) {}

  @Post()
  create(@Body() dto: CreateRoadmapStepDto) {
    return this.roadmapStepService.create(dto);
  }

  @Get()
  findAll() {
    return this.roadmapStepService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roadmapStepService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoadmapStepDto) {
    return this.roadmapStepService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roadmapStepService.remove(id);
  }
}
