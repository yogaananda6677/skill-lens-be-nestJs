import { Test, TestingModule } from '@nestjs/testing';
import { SekolahService } from './sekolah.service';

describe('SekolahService', () => {
  let service: SekolahService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SekolahService],
    }).compile();

    service = module.get<SekolahService>(SekolahService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
