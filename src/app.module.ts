import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GithubTrackModule } from './github-track/github-track.module';
import { UserPrScoreModule } from './user-pr-score/user-pr-score.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
        MongooseModule.forRoot('mongodb://localhost:27017/meliora-ai'),
        GithubTrackModule,
        UserPrScoreModule,
        ConfigModule.forRoot({
          isGlobal: true,  
          envFilePath: '.env', 
    }),

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
