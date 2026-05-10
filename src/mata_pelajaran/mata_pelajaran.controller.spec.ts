import { Test, TestingModule } from '@nestjs/testing';
import { MataPelajaranController } from './mata_pelajaran.controller';

describe('MataPelajaranController', () => {
  let controller: MataPelajaranController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MataPelajaranController],
    }).compile();

    controller = module.get<MataPelajaranController>(MataPelajaranController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
