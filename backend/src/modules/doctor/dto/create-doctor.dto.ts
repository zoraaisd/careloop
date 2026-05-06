import {
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

  @IsOptional()
  @IsString()
  @MaxLength(120)
  medicalRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  medicalCouncilBoard?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  clinicName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  clinicAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  clinicPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  consultationFees?: number;

  @IsOptional()
  availableDays?: string[];

  @IsOptional()
  availableTimeSlots?: string[];

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
