import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapStepDetailController } from './roadmap_step_detail.controller';
import { RoadmapStepDetailService } from './roadmap_step_detail.service';

describe('RoadmapStepDetailController', () => {
  let controller: RoadmapStepDetailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoadmapStepDetailController],
      providers: [RoadmapStepDetailService],
    }).compile();

    controller = module.get<RoadmapStepDetailController>(RoadmapStepDetailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
