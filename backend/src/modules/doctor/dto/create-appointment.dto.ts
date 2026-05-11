import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { AppointmentStatus } from '../../../entities/appointment.entity';

export class CreateAppointmentDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsString()
  @IsNotEmpty()
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  day?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i, {
    message: 'time must be in hh:mm AM/PM format',
  })
  time!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appointmentType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  billingAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
