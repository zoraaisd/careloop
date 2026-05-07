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

    const items = await this.inventoryRepository.find({
      where: clinicId ? { clinicId } : {},
      order: { createdAt: 'DESC' },
    });

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
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
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
      clinicId: clinicId ?? null,
    });

    const savedItem = await this.inventoryRepository.save(item);

    return {
      message: 'Inventory item created successfully',
      inventoryItemId: savedItem.id,
    };
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
}
