import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoadmapMaster } from '../roadmap_master/entities/roadmap_master.entity';
import { RoadmapStep } from './entities/roadmap_step.entity';
import { RoadmapStepController } from './roadmap_step.controller';
import { RoadmapStepService } from './roadmap_step.service';
import { RoadmapStepDetail } from '../roadmap_step_detail/entities/roadmap_step_detail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoadmapMaster, RoadmapStep, RoadmapStepDetail])],
  controllers: [RoadmapStepController],
  providers: [RoadmapStepService],
})
export class RoadmapStepModule {}
