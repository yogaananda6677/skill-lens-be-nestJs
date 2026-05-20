import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapStepDetailService } from './roadmap_step_detail.service';

describe('RoadmapStepDetailService', () => {
  let service: RoadmapStepDetailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoadmapStepDetailService],
    }).compile();

    service = module.get<RoadmapStepDetailService>(RoadmapStepDetailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
