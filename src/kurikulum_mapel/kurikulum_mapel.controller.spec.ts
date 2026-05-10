import { Test, TestingModule } from '@nestjs/testing';
import { KurikulumMapelController } from './kurikulum_mapel.controller';

describe('KurikulumMapelController', () => {
  let controller: KurikulumMapelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KurikulumMapelController],
    }).compile();

    controller = module.get<KurikulumMapelController>(KurikulumMapelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
