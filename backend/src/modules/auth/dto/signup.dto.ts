import {
  ArrayMinSize,
  IsDefined,
  IsArray,
  IsDateString,
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
  @MaxLength(120)
  councilRegisteredName!: string;

  @IsString()
  @IsNotEmpty()
  @IsDateString({}, {
    message: 'dateOfBirth must be a valid date',
  })
  dateOfBirth!: string;

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

  @Type(() => Number)
  @IsNumber()
  consultationFees!: number;

  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : String(value ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
  )
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  availableDays!: string[];

  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : String(value ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
  )
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
  @MaxLength(255)
  profileImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  certificateUrl?: string;
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
