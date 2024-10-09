import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserPrScoreController } from './user-pr-score.controller';
import { UserPrScoreService } from './user-pr-score.service';
import { UserPrScore, UserPrScoreSchema } from './user-pr-score.schema';
import { UserPrScoreRepository } from './user-pr-score.repository';
import { GithubTrackService } from 'src/github-track/github-track.service';
import { GithubTrackModule } from 'src/github-track/github-track.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: UserPrScore.name, schema: UserPrScoreSchema }]),
    ],
    controllers: [UserPrScoreController],
    providers: [UserPrScoreService, UserPrScoreRepository],
    exports: [UserPrScoreService, UserPrScoreRepository], 
})
export class UserPrScoreModule {}
