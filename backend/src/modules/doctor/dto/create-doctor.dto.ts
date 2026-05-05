import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDoctorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[+]?[\d\s()-]{7,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  specialization!: string;

  @Type(() => Number)
  @IsNumber()
  experience!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  qualification!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  medicalRegistrationNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  medicalCouncilBoard!: string;

  @IsString()
  @IsNotEmpty()
  dateOfBirth!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  clinicName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  clinicAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @Type(() => Number)
  @IsNumber()
  consultationFees!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  availableDays!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  availableTimeSlots!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  aboutDoctor?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @IsOptional()
  @IsString()
  clinicImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  certificateUrl?: string;

  @IsString()
  @IsNotEmpty()
  signupVerificationToken!: string;
}
