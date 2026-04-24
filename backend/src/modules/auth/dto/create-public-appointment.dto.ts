import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePublicAppointmentDto {
  @IsUUID()
  slotId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  patientName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  patientPhone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  patientEmail?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  patientAge!: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  patientGender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
