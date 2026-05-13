import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phone must be a valid international phone number',
  })
  phone!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(130)
  age!: number;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  condition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsUUID()
  primaryDoctorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  weight?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  height?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sugar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  healthProblem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  allergies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  chronicDiseases?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pastSurgeries?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  previousTreatments?: string;
}
