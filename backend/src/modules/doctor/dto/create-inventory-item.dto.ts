import {
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  itemName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category!: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  vendor?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  unit!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reorderLevel!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost!: number;
}
