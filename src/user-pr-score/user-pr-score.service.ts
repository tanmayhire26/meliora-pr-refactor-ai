import { Injectable } from '@nestjs/common';
import { CreateUserPrScoreDto } from './dto/create-user-pr-score.dto';
import { UpdateUserPrScoreDto } from './dto/update-user-pr-score.dto';
import { UserPrScoreRepository } from './user-pr-score.repository';

@Injectable()
export class UserPrScoreService {
  constructor (
   private readonly userPrScoreRepository: UserPrScoreRepository
  ) {

  }
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
}
