import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapMasterController } from './roadmap_master.controller';
import { RoadmapMasterService } from './roadmap_master.service';

describe('RoadmapMasterController', () => {
  let controller: RoadmapMasterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoadmapMasterController],
      providers: [RoadmapMasterService],
    }).compile();

    controller = module.get<RoadmapMasterController>(RoadmapMasterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
