import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GithubTrackModule } from './github-track/github-track.module';

@Module({
  imports: [
        MongooseModule.forRoot('mongodb://localhost:27017/meliora-ai'),
        GithubTrackModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
