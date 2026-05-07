import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  confirmPassword!: string;
}
