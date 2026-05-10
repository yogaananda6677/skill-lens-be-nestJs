import { Test, TestingModule } from '@nestjs/testing';
import { JurusanController } from './jurusan.controller';

describe('JurusanController', () => {
  let controller: JurusanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JurusanController],
    }).compile();

    controller = module.get<JurusanController>(JurusanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
