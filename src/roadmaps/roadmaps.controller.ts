import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';
import { CreateStepNoteDto } from './dto/create-step-note.dto';
import { SelectRoadmapDto } from './dto/select-roadmap.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { RoadmapsService } from './roadmaps.service';

@Controller('roadmaps')
export class RoadmapsController {
  constructor(private readonly roadmapsService: RoadmapsService) {}

  @Get('published')
  listPublishedRoadmaps() {
    return this.roadmapsService.listPublishedRoadmaps();
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['siswa']))
  @Post('student/select')
  selectRoadmap(@Req() req: any, @Body() dto: SelectRoadmapDto) {
    return this.roadmapsService.selectRoadmap(req.user.id_user, dto);
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['siswa']))
  @Get('student/history')
  getMyRoadmapHistory(@Req() req: any) {
    return this.roadmapsService.getMyRoadmapHistory(req.user.id_user);
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['siswa']))
  @Get('student/active')
  getMyActiveRoadmap(@Req() req: any) {
    return this.roadmapsService.getMyActiveRoadmap(req.user.id_user);
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['siswa']))
  @Patch('student/progress/:id')
  updateMyProgress(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.roadmapsService.updateMyProgress(req.user.id_user, id, dto);
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['guru']))
  @Get('guru/siswa/:idSiswa')
  getStudentRoadmapForGuru(
    @Req() req: any,
    @Param('idSiswa', ParseIntPipe) idSiswa: number,
  ) {
    return this.roadmapsService.getStudentRoadmapForGuru(req.user.id_user, idSiswa);
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['guru']))
  @Post('guru/step-notes')
  addStepNote(@Req() req: any, @Body() dto: CreateStepNoteDto) {
    return this.roadmapsService.addStepNote(req.user.id_user, dto);
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['guru']))
  @Get('guru/step-notes/:studentRoadmapId/:stepId')
  listStepNotes(
    @Req() req: any,
    @Param('studentRoadmapId', ParseIntPipe) studentRoadmapId: number,
    @Param('stepId', ParseIntPipe) stepId: number,
  ) {
    return this.roadmapsService.listStepNotes(req.user.id_user, studentRoadmapId, stepId);
  }
}
