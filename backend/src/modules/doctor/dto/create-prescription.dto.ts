import {
  ArrayMinSize,
  IsDateString,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PrescriptionMedicineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  medicineName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  dosage!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  instruction!: string;
}

export class CreatePrescriptionDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  diagnosis!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionMedicineDto)
  medicines!: PrescriptionMedicineDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsDateString()
  prescriptionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pdfUrl?: string;
}
