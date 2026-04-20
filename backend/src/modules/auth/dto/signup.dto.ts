import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UserRole } from '../../../entities/user.entity';

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
}
