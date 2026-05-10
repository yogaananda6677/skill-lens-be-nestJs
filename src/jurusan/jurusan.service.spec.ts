import { Test, TestingModule } from '@nestjs/testing';
import { JurusanService } from './jurusan.service';

describe('JurusanService', () => {
  let service: JurusanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JurusanService],
    }).compile();

    service = module.get<JurusanService>(JurusanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
