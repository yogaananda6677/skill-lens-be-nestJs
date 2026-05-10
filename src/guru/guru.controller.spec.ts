import { Test, TestingModule } from '@nestjs/testing';
import { GuruController } from './guru.controller';

describe('GuruController', () => {
  let controller: GuruController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuruController],
    }).compile();

    controller = module.get<GuruController>(GuruController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
