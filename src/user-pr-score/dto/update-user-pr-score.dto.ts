import { PartialType } from '@nestjs/mapped-types';
import { CreateUserPrScoreDto } from './create-user-pr-score.dto';

export class UpdateUserPrScoreDto extends PartialType(CreateUserPrScoreDto) {}
