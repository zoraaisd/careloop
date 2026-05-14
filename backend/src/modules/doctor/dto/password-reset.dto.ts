import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

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
  @MaxLength(10)
  otp!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  confirmPassword!: string;
}
