import { Test, TestingModule } from '@nestjs/testing';
import { GithubTrackService } from './github-track.service';

describe('GithubTrackService', () => {
  let service: GithubTrackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GithubTrackService],
    }).compile();

    service = module.get<GithubTrackService>(GithubTrackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
