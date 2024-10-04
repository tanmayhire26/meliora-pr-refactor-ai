import { Test, TestingModule } from '@nestjs/testing';
import { GithubTrackController } from './github-track.controller';
import { GithubTrackService } from './github-track.service';

describe('GithubTrackController', () => {
  let controller: GithubTrackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubTrackController],
      providers: [GithubTrackService],
    }).compile();

    controller = module.get<GithubTrackController>(GithubTrackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
