import { Test, TestingModule } from '@nestjs/testing';
import { SiswaController } from './siswa.controller';

describe('SiswaController', () => {
  let controller: SiswaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiswaController],
    }).compile();

    controller = module.get<SiswaController>(SiswaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
