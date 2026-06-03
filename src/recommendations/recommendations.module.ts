import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoadmapMaster } from '../roadmap_master/entities/roadmap_master.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { StudentRoadmap } from '../roadmaps/entities/student-roadmap.entity';
import { RecommendationResult } from './entities/recommendation-result.entity';
import { RecommendationRun } from './entities/recommendation-run.entity';
import { RecommendationsService } from './recommendations.service';
import { SpkClientService } from './spk-client.service';

@Module({
  imports: [TypeOrmModule.forFeature([RecommendationRun, RecommendationResult, Siswa, RoadmapMaster, StudentRoadmap])],
  providers: [RecommendationsService, SpkClientService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
