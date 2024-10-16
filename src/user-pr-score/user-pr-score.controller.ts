import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserPrScoreService } from './user-pr-score.service';
import { CreateUserPrScoreDto } from './dto/create-user-pr-score.dto';
import { UpdateUserPrScoreDto } from './dto/update-user-pr-score.dto';

@Controller('user-pr-score')
export class UserPrScoreController {
  constructor(private readonly userPrScoreService: UserPrScoreService) {}

  @Post()
  create(@Body() createUserPrScoreDto: CreateUserPrScoreDto) {
    return this.userPrScoreService.create(createUserPrScoreDto);
  }

  @Get()
  async findAll() {
    return await this.userPrScoreService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userPrScoreService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserPrScoreDto: UpdateUserPrScoreDto) {
    return this.userPrScoreService.update(+id, updateUserPrScoreDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userPrScoreService.remove(+id);
  }
  @Get('performance/:username')
  async getDataForUsername (
    @Param('username') username: string
  ) {
    try {
      const userData = await this.userPrScoreService.getAllDataForUserName(username);
      return userData;
    } catch (error) {
      console.log(error.response.data.message);
      throw error;
    }
  }
  @Get('analysis-summary/:username')
  async getAnalysisSummaryForUsername (
    @Param('username') username: string
  ) {
    try {
      const analysisSummary = await this.userPrScoreService.getAnalysisSummaryForUsername(username);
      return analysisSummary;
    } catch (error) {
      console.log(error.response.data.message);
      throw error;
    }
  }
}
