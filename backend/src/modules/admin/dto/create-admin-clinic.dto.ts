import { IsEmail, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAdminClinicDto {
  @IsString()
  @MaxLength(150)
  clinicName!: string;

  @IsString()
  @MaxLength(120)
  ownerName!: string;

  @IsString()
  @MaxLength(255)
  address!: string;

  @IsString()
  @MaxLength(20)
  contact!: string;

  @IsString()
  @MaxLength(80)
  subscriptionPlan!: string;

  @IsInt()
  @Min(0)
  doctors!: number;

  @IsInt()
  @Min(0)
  patients!: number;

  @IsString()
  @IsIn(['Active', 'Pending Approval', 'Suspended'])
  status!: 'Active' | 'Pending Approval' | 'Suspended';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;
}
