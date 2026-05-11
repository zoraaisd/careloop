import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { UserRole } from '../../entities/user.entity';

export class RequestSignupOtpDto {
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
  @Matches(/^(doctor|patient)$/, {
    message: 'role must be either doctor or patient',
  })
  role!: UserRole.DOCTOR | UserRole.PATIENT;
}

export class VerifySignupOtpDto {
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
  @Matches(/^(doctor|patient)$/, {
    message: 'role must be either doctor or patient',
  })
  role!: UserRole.DOCTOR | UserRole.PATIENT;

  @IsString()
  @MinLength(4)
  @MaxLength(6)
  @Matches(/^\d{4,6}$/, {
    message: 'otp must be 4 to 6 digits',
  })
  otp!: string;
}
