import { Test, TestingModule } from '@nestjs/testing';
import { NilaiSiswaService } from './nilai_siswa.service';

describe('NilaiSiswaService', () => {
  let service: NilaiSiswaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NilaiSiswaService],
    }).compile();

    service = module.get<NilaiSiswaService>(NilaiSiswaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
