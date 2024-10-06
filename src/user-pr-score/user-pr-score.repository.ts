import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserPrScore } from './user-pr-score.schema';

@Injectable()
export class UserPrScoreRepository {
    constructor(@InjectModel(UserPrScore.name) private userPrScoreModel: Model<UserPrScore>) {}

    async create(createUserPrScoreDto: Partial<UserPrScore>): Promise<UserPrScore> {
        const newUserPrScore = new this.userPrScoreModel(createUserPrScoreDto);
        return await newUserPrScore.save();
    }

    async findById(id: string): Promise<UserPrScore | null> {
        return this.userPrScoreModel.findById(id).exec();
    }

    async findAll(): Promise<UserPrScore[]> {
        return this.userPrScoreModel.find().exec();
    }

    async update(id: string, updateData: Partial<UserPrScore>): Promise<UserPrScore | null> {
        return this.userPrScoreModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    }

    async delete(id: string): Promise<UserPrScore | null> {
        return this.userPrScoreModel.findByIdAndDelete(id).exec();
    }
}
