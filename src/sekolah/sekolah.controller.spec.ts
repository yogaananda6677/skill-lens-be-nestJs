import { Test, TestingModule } from '@nestjs/testing';
import { SekolahController } from './sekolah.controller';

describe('SekolahController', () => {
  let controller: SekolahController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SekolahController],
    }).compile();

    controller = module.get<SekolahController>(SekolahController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
