import {
  IsDateString,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFollowUpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  message!: string;

  @IsDateString()
  scheduledAt!: string;
}
