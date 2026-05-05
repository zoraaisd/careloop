import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RequestPasswordResetOtpDto {
  @IsEmail()
  @MaxLength(150)
  email!: string;
}

export class ResetPasswordWithOtpDto {
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(6)
  @Matches(/^\d{4,6}$/, {
    message: 'otp must be 4 to 6 digits',
  })
  otp!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(120)
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(120)
  confirmPassword!: string;
}
