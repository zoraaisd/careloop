import {
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

export class CreateAdminClinicDoctorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, {
    message: 'clinicPhone must be exactly 10 digits',
  })
  clinicPhone!: string;

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
  @Type(() => Number)
  @IsNumber()
  consultationFees!: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableDays!: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableTimeSlots!: string[];

  @IsOptional()
  @IsString()
  medicalRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  medicalCouncilBoard?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  aboutDoctor?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @IsOptional()
  @IsString()
  certificateUrl?: string;
}
