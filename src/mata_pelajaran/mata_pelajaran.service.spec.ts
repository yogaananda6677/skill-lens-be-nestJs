import { Test, TestingModule } from '@nestjs/testing';
import { MataPelajaranService } from './mata_pelajaran.service';

describe('MataPelajaranService', () => {
  let service: MataPelajaranService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MataPelajaranService],
    }).compile();

    service = module.get<MataPelajaranService>(MataPelajaranService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
