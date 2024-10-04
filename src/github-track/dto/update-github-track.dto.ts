import { PartialType } from '@nestjs/mapped-types';
import { CreateGithubTrackDto } from './create-github-track.dto';

export class UpdateGithubTrackDto extends PartialType(CreateGithubTrackDto) {}
