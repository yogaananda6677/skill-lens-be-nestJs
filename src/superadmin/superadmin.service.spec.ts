import { Test, TestingModule } from '@nestjs/testing';
import { SuperadminService } from './superadmin.service';

describe('SuperadminService', () => {
  let service: SuperadminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuperadminService],
    }).compile();

    service = module.get<SuperadminService>(SuperadminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
