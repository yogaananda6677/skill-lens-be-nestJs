import { Test, TestingModule } from '@nestjs/testing';
import { GuruService } from './guru.service';

describe('GuruService', () => {
  let service: GuruService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuruService],
    }).compile();

    service = module.get<GuruService>(GuruService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
