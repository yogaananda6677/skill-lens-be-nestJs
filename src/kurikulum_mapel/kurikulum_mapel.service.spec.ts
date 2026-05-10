import { Test, TestingModule } from '@nestjs/testing';
import { KurikulumMapelService } from './kurikulum_mapel.service';

describe('KurikulumMapelService', () => {
  let service: KurikulumMapelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KurikulumMapelService],
    }).compile();

    service = module.get<KurikulumMapelService>(KurikulumMapelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
