import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RestockInventoryItemDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  batchNumber?: string;

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  purchasePrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  sellingPrice?: number;
}
