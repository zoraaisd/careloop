import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import { InventoryItem } from '../../../entities/inventory-item.entity';
import type { CreateInventoryItemDto } from '../dto/create-inventory-item.dto';
import type { InventoryResponse } from '../types/doctor.types';
import { parseMoney } from './doctor.utils';
import { DoctorAccessService } from './doctor-access.service';

export class InventoryService {
  private readonly inventoryRepository = AppDataSource.getRepository(InventoryItem);
  private readonly accessService = new DoctorAccessService();

  async getInventory(currentDoctorId?: string): Promise<InventoryResponse> {
    const accessState = await this.accessService.getAccessState(currentDoctorId);
    const clinicId = accessState.clinicId;

    try {
      const items = await this.inventoryRepository.find({
        where: clinicId ? { clinicId } : {},
        order: { createdAt: 'DESC' },
      });

      console.log(`Fetched ${items.length} inventory items for clinicId: ${clinicId}`);

      return {
        summary: {
          itemsCount: items.length,
          totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
          lowStockCount: items.filter((item) => item.quantity <= item.reorderLevel)
            .length,
          stockValue: items.reduce(
            (sum, item) => sum + item.quantity * parseMoney(item.sellingPrice || '0'),
            0,
          ),
        },
        items: items.map((item) => ({
          inventoryItemId: item.id,
          itemName: item.itemName,
          sku: item.sku,
          medicineType: item.medicineType,
          category: item.category,
          stockQuantity: item.quantity,
          stockUnit: item.unit,
          strengthComposition: item.strengthComposition,
          barcodeQrCode: item.barcodeQrCode,
          storageType: item.storageType,
          prescriptionRequired: item.prescriptionRequired,
          gstTax: Number(item.gstTax),
          purchasePrice: parseMoney(item.purchasePrice),
          sellingPrice: parseMoney(item.sellingPrice),
          minimumStockLevel: item.minimumStockLevel,
          reorderLevel: item.reorderLevel,
          isActive: item.isActive,
          storageArea: item.storageArea,
          rackShelf: item.rackShelf,
          row: item.row,
          column: item.column,
          boxBinNumber: item.boxBinNumber,
          slotPosition: item.slotPosition,
          notes: item.notes,
          vendor: item.vendor,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate ? (typeof item.expiryDate === 'string' ? item.expiryDate : item.expiryDate.toISOString()) : null,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
      };
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  }

  async createInventoryItem(
    payload: CreateInventoryItemDto,
    currentDoctorId?: string,
  ): Promise<{ message: string; inventoryItemId: string }> {
    const accessState = await this.accessService.getAccessState(currentDoctorId);
    const clinicId = accessState.clinicId;

    const item = this.inventoryRepository.create({
      itemName: payload.itemName.trim(),
      sku: payload.sku?.trim() || null,
      medicineType: payload.medicineType?.trim() || null,
      category: payload.category.trim(),
      unit: payload.unit.trim(),
      strengthComposition: payload.strengthComposition?.trim() || null,
      barcodeQrCode: payload.barcodeQrCode?.trim() || null,
      storageType: payload.storageType?.trim() || null,
      prescriptionRequired: payload.prescriptionRequired ?? false,
      gstTax: payload.gstTax ?? 0,
      purchasePrice: (payload.purchasePrice ?? 0).toFixed(2),
      sellingPrice: (payload.sellingPrice ?? 0).toFixed(2),
      quantity: payload.quantity,
      minimumStockLevel: payload.minimumStockLevel ?? 0,
      reorderLevel: payload.reorderLevel ?? 0,
      isActive: payload.isActive ?? true,
      storageArea: payload.storageArea?.trim() || null,
      rackShelf: payload.rackShelf?.trim() || null,
      row: payload.row?.trim() || null,
      column: payload.column?.trim() || null,
      boxBinNumber: payload.boxBinNumber?.trim() || null,
      slotPosition: payload.slotPosition?.trim() || null,
      notes: payload.notes?.trim() || null,
      vendor: payload.vendor?.trim() ?? null,
      batchNumber: payload.batchNumber?.trim() || null,
      expiryDate: payload.expiryDate && payload.expiryDate.trim() !== '' ? payload.expiryDate : null,
      clinicId: clinicId ?? null,
    });

    try {
      const savedItem = await this.inventoryRepository.save(item);
      return {
        message: 'Inventory item created successfully',
        inventoryItemId: savedItem.id,
      };
    } catch (error) {
      console.error('Database error saving inventory item:', error);
      throw error;
    }
  }

  async deleteInventoryItem(itemId: string, currentDoctorId?: string): Promise<{ message: string }> {
    const accessState = await this.accessService.getAccessState(currentDoctorId);
    const clinicId = accessState.clinicId;

    const item = await this.inventoryRepository.findOne({ 
      where: clinicId ? { id: itemId, clinicId } : { id: itemId } 
    });

    if (!item) {
      throw new AppError('Inventory item not found', 404);
    }

    await this.inventoryRepository.remove(item);
    return { message: 'Inventory item deleted successfully' };
  }

  async restockInventoryItem(
    itemId: string,
    payload: {
      quantity: number;
      batchNumber?: string;
      expiryDate?: string;
      purchasePrice?: number;
      sellingPrice?: number;
    },
    currentDoctorId?: string,
  ): Promise<{ message: string; newQuantity: number }> {
    const accessState = await this.accessService.getAccessState(currentDoctorId);
    const clinicId = accessState.clinicId;

    const item = await this.inventoryRepository.findOne({
      where: clinicId ? { id: itemId, clinicId } : { id: itemId },
    });

    if (!item) {
      throw new AppError('Inventory item not found', 404);
    }

    item.quantity += payload.quantity;
    if (payload.batchNumber) item.batchNumber = payload.batchNumber;
    if (payload.expiryDate) item.expiryDate = payload.expiryDate;
    if (payload.purchasePrice !== undefined) item.purchasePrice = payload.purchasePrice.toFixed(2);
    if (payload.sellingPrice !== undefined) item.sellingPrice = payload.sellingPrice.toFixed(2);
    
    const savedItem = await this.inventoryRepository.save(item);

    return {
      message: 'Inventory item restocked successfully',
      newQuantity: savedItem.quantity,
    };
  }
}
