import { Test, TestingModule } from '@nestjs/testing';
import { SiswaTagService } from './siswa_tag.service';

describe('SiswaTagService', () => {
  let service: SiswaTagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SiswaTagService],
    }).compile();

    service = module.get<SiswaTagService>(SiswaTagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
