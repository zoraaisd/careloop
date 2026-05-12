import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangeDoctorPasswordDto {
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
