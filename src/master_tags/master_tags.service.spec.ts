import { Test, TestingModule } from '@nestjs/testing';
import { MasterTagsService } from './master_tags.service';

describe('MasterTagsService', () => {
  let service: MasterTagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MasterTagsService],
    }).compile();

    service = module.get<MasterTagsService>(MasterTagsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
