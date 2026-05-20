import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoadmapStep } from '../roadmap_step/entities/roadmap_step.entity';
import { RoadmapStepDetail } from './entities/roadmap_step_detail.entity';
import { RoadmapStepDetailController } from './roadmap_step_detail.controller';
import { RoadmapStepDetailService } from './roadmap_step_detail.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoadmapStep, RoadmapStepDetail])],
  controllers: [RoadmapStepDetailController],
  providers: [RoadmapStepDetailService],
})
export class RoadmapStepDetailModule {}
