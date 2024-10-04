import { Module } from '@nestjs/common';
import { GithubTrackService } from './github-track.service';
import { GithubTrackController } from './github-track.controller';

@Module({
  controllers: [GithubTrackController],
  providers: [GithubTrackService],
})
export class GithubTrackModule {}
