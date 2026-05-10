import { Test, TestingModule } from '@nestjs/testing';
import { NilaiSiswaController } from './nilai_siswa.controller';

describe('NilaiSiswaController', () => {
  let controller: NilaiSiswaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NilaiSiswaController],
    }).compile();

    controller = module.get<NilaiSiswaController>(NilaiSiswaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
