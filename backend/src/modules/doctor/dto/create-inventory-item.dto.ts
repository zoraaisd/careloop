import {
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  itemName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  sku?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  medicineType?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  unit!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  strengthComposition?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  barcodeQrCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  storageType?: string;

  @IsBoolean()
  @IsOptional()
  prescriptionRequired?: boolean;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  gstTax?: number;

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

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minimumStockLevel?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  reorderLevel?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  storageArea?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  rackShelf?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  row?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  column?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  boxBinNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  slotPosition?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  vendor?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(24)
  paymentStatus?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  gstNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  batchNumber?: string;

  @IsString()
  @IsOptional()
  expiryDate?: string;
}
