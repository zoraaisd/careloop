import {
  Allow,
  IsDefined,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { UserRole } from '../../../entities/user.entity';

export class DoctorProfileSignupDto {
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
  @Allow()
  medicalRegistrationNumber?: string;

  @IsOptional()
  @Allow()
  medicalCouncilBoard?: string;

  @IsOptional()
  @Allow()
  councilRegisteredName?: string;

  @IsOptional()
  @Allow()
  dateOfBirth?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  clinicName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  clinicAddress!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  clinicId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @Allow()
  consultationFees?: number;

  @IsOptional()
  @Allow()
  availableDays?: string[];

  @IsOptional()
  @Allow()
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
  @IsArray()
  @IsString({ each: true })
  clinicImageUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clinicVideoUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  certificateUrl?: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @Matches(/^\d{10}$/, {
    message: 'clinicPhoneNumber must be exactly 10 digits',
  })
  @MinLength(10)
  @MaxLength(10)
  clinicPhoneNumber!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @Matches(/^\d{10}$/, {
    message: 'clinicPhone must be exactly 10 digits',
  })
  @MinLength(10)
  @MaxLength(10)
  clinicPhone?: string;
}

export class SignupDto {
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
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  confirmPassword!: string;

  @IsString()
  @Matches(/^(doctor|patient)$/, {
    message: 'role must be either doctor or patient',
  })
  role!: UserRole.DOCTOR | UserRole.PATIENT;

  @IsString()
  @IsNotEmpty()
  signupVerificationToken!: string;

  @ValidateIf((payload: SignupDto) => payload.role === UserRole.DOCTOR)
  @IsDefined({ message: 'doctorProfile is required for doctor signup' })
  @ValidateNested()
  @Type(() => DoctorProfileSignupDto)
  doctorProfile?: DoctorProfileSignupDto;
}
