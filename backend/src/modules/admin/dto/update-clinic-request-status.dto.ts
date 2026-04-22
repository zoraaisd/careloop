import { IsIn, IsString } from 'class-validator';

export class UpdateClinicRequestStatusDto {
  @IsString()
  @IsIn(['Pending', 'Under Review', 'Approved', 'Rejected'])
  status!: 'Pending' | 'Under Review' | 'Approved' | 'Rejected';
}
