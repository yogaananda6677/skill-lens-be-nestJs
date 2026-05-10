import { Test, TestingModule } from '@nestjs/testing';
import { SiswaService } from './siswa.service';

describe('SiswaService', () => {
  let service: SiswaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SiswaService],
    }).compile();

    service = module.get<SiswaService>(SiswaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
