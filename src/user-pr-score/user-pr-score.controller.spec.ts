import { Test, TestingModule } from '@nestjs/testing';
import { UserPrScoreController } from './user-pr-score.controller';
import { UserPrScoreService } from './user-pr-score.service';

describe('UserPrScoreController', () => {
  let controller: UserPrScoreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPrScoreController],
      providers: [UserPrScoreService],
    }).compile();

    controller = module.get<UserPrScoreController>(UserPrScoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
