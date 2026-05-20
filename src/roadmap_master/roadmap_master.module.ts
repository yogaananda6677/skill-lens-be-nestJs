import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoadmapMaster } from './entities/roadmap_master.entity';
import { RoadmapMasterController } from './roadmap_master.controller';
import { RoadmapMasterService } from './roadmap_master.service';
import { RoadmapStep } from '../roadmap_step/entities/roadmap_step.entity';
import { RoadmapStepDetail } from '../roadmap_step_detail/entities/roadmap_step_detail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoadmapMaster, RoadmapStep, RoadmapStepDetail])],
  controllers: [RoadmapMasterController],
  providers: [RoadmapMasterService],
})
export class RoadmapMasterModule {}
