import { Test, TestingModule } from '@nestjs/testing';
import { PrestasiSiswaController } from './prestasi_siswa.controller';
import { PrestasiSiswaService } from './prestasi_siswa.service';

describe('PrestasiSiswaController', () => {
  let controller: PrestasiSiswaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrestasiSiswaController],
      providers: [PrestasiSiswaService],
    }).compile();

    controller = module.get<PrestasiSiswaController>(PrestasiSiswaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
