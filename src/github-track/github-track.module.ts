import { Module } from '@nestjs/common';
import { GithubTrackService } from './github-track.service';
import { GithubTrackController } from './github-track.controller';
import { UserPrScoreModule } from 'src/user-pr-score/user-pr-score.module';

@Module({
  imports: [UserPrScoreModule ],
  controllers: [GithubTrackController],
  providers: [GithubTrackService,],
  exports: [GithubTrackService],
})
export class GithubTrackModule {}
