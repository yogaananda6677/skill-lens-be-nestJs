import { Test, TestingModule } from '@nestjs/testing';
import { SchoolLookupController } from './school-lookup.controller';

describe('SchoolLookupController', () => {
  let controller: SchoolLookupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchoolLookupController],
    }).compile();

    controller = module.get<SchoolLookupController>(SchoolLookupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
