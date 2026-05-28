import { Test, TestingModule } from '@nestjs/testing';
import { SchoolLookupService } from './school-lookup.service';

describe('SchoolLookupService', () => {
  let service: SchoolLookupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchoolLookupService],
    }).compile();

    service = module.get<SchoolLookupService>(SchoolLookupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
