import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapStepService } from './roadmap_step.service';

describe('RoadmapStepService', () => {
  let service: RoadmapStepService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoadmapStepService],
    }).compile();

    service = module.get<RoadmapStepService>(RoadmapStepService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
