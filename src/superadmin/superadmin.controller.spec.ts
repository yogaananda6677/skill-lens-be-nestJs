import { Test, TestingModule } from '@nestjs/testing';
import { SuperadminController } from './superadmin.controller';

describe('SuperadminController', () => {
  let controller: SuperadminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperadminController],
    }).compile();

    controller = module.get<SuperadminController>(SuperadminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
