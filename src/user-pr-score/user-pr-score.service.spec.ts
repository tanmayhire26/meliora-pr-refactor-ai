import { Test, TestingModule } from '@nestjs/testing';
import { UserPrScoreService } from './user-pr-score.service';

describe('UserPrScoreService', () => {
  let service: UserPrScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserPrScoreService],
    }).compile();

    service = module.get<UserPrScoreService>(UserPrScoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
