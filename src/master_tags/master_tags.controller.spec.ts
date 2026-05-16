import { Test, TestingModule } from '@nestjs/testing';
import { MasterTagsController } from './master_tags.controller';
import { MasterTagsService } from './master_tags.service';

describe('MasterTagsController', () => {
  let controller: MasterTagsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterTagsController],
      providers: [MasterTagsService],
    }).compile();

    controller = module.get<MasterTagsController>(MasterTagsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
