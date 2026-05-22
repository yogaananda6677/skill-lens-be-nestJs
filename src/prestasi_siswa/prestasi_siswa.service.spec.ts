import { Test, TestingModule } from '@nestjs/testing';
import { PrestasiSiswaService } from './prestasi_siswa.service';

describe('PrestasiSiswaService', () => {
  let service: PrestasiSiswaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrestasiSiswaService],
    }).compile();

    service = module.get<PrestasiSiswaService>(PrestasiSiswaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
