import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapMasterService } from './roadmap_master.service';

describe('RoadmapMasterService', () => {
  let service: RoadmapMasterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoadmapMasterService],
    }).compile();

    service = module.get<RoadmapMasterService>(RoadmapMasterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
