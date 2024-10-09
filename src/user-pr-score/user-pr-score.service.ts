import { Injectable } from '@nestjs/common';
import { CreateUserPrScoreDto } from './dto/create-user-pr-score.dto';
import { UpdateUserPrScoreDto } from './dto/update-user-pr-score.dto';
import { UserPrScoreRepository } from './user-pr-score.repository';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class UserPrScoreService {
  constructor (
   private readonly userPrScoreRepository: UserPrScoreRepository,
  ) {

  }
    private readonly API_KEY = process.env.GEMINI_API_KEY;


  create(createUserPrScoreDto: CreateUserPrScoreDto) {
    return 'This action adds a new userPrScore';
  }

  async findAll() {
    return await this.userPrScoreRepository.findAll();
  }

  findOne(id: number) {
    return `This action returns a #${id} userPrScore`;
  }

  update(id: number, updateUserPrScoreDto: UpdateUserPrScoreDto) {
    return `This action updates a #${id} userPrScore`;
  }

  remove(id: number) {
    return `This action removes a #${id} userPrScore`;
  }

  async getAnalysisSummaryForUsername(username: string) {
    try {
      const userData =  await this.userPrScoreRepository.getAllDataForUsername(username);
      console.log("userData from db",userData)
      const analysisData = userData.map((ud)=>({analysis: ud.analysis, created_at: ud.createdAt}));
      console.log("Analysis data after map .. .. . . ", analysisData);
      const prompt = `I want you to analyse the following data of a developer's coding abilities recorded over time and give a summary. Also you should suggest areas of improvements, weaknesses, strength, opportunities, threats, etc and what the developer should focus on learning and practicing to improve his/her skills.
      ${JSON.stringify(analysisData)}
      
      The response should be as if you are this developer's mentor and you are talking to him in person. Do not include any unnecessary commentory in the response, only the analysis and feedback and guidance to the developer`
      const responseAboutAnalsysisFromGeminiPrompt = await this.getResponseFromGeminiPrompt(prompt);
      return responseAboutAnalsysisFromGeminiPrompt;
    } catch (error) {
      console.log(error);
      throw error;
    }
    
  }

  async getResponseFromGeminiPrompt(prompt) {
  try {
    console.log("Prompt .. .. .. .. .. . . ", prompt);
    const genAI = new GoogleGenerativeAI(this.API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.log(error.response.data.message);
  }
}
}
