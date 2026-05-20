import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Guru } from '../guru/entities/guru.entity';
import { RoadmapMaster } from '../roadmap_master/entities/roadmap_master.entity';
import { RoadmapStep } from '../roadmap_step/entities/roadmap_step.entity';
import { RoadmapStepDetail } from '../roadmap_step_detail/entities/roadmap_step_detail.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { User } from '../user/entities/user.entity';
import { RoadmapStepNote } from './entities/roadmap-step-note.entity';
import { StudentRoadmapProgress } from './entities/student-roadmap-progress.entity';
import { StudentRoadmap } from './entities/student-roadmap.entity';
import { RoadmapsController } from './roadmaps.controller';
import { RoadmapsService } from './roadmaps.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Siswa,
      User,
      Guru,
      RoadmapMaster,
      RoadmapStep,
      RoadmapStepDetail,
      StudentRoadmap,
      StudentRoadmapProgress,
      RoadmapStepNote,
    ]),
  ],
  controllers: [RoadmapsController],
  providers: [RoadmapsService],
  exports: [RoadmapsService],
})
export class RoadmapsModule {}
