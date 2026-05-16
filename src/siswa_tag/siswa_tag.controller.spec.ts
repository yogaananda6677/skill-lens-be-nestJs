import { Test, TestingModule } from '@nestjs/testing';
import { SiswaTagController } from './siswa_tag.controller';
import { SiswaTagService } from './siswa_tag.service';

describe('SiswaTagController', () => {
  let controller: SiswaTagController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiswaTagController],
      providers: [SiswaTagService],
    }).compile();

    controller = module.get<SiswaTagController>(SiswaTagController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
