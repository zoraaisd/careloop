import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsInt,
  IsArray,
  IsBoolean,
  Max,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePublicDoctorReviewDto {
  @IsBoolean()
  recommendDoctor!: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  healthProblem!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  waitTime!: string;

  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  improvements!: string[];

  @IsString()
  @MinLength(20)
  @MaxLength(1500)
  experienceStory!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reviewerName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  reviewerPhone!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  starRating!: number;

  @IsOptional()
  @Transform(({ value }) => Boolean(value))
  @IsBoolean()
  isAnonymous?: boolean;
}
