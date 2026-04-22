import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RespondSupportTicketDto {
  @IsString()
  @IsIn(['email', 'whatsapp'])
  method!: 'email' | 'whatsapp';

  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  attachmentName?: string;
}
