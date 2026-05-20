import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapStepController } from './roadmap_step.controller';
import { RoadmapStepService } from './roadmap_step.service';

describe('RoadmapStepController', () => {
  let controller: RoadmapStepController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoadmapStepController],
      providers: [RoadmapStepService],
    }).compile();

    controller = module.get<RoadmapStepController>(RoadmapStepController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
