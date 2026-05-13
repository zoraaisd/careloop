import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import { InventoryItem } from '../../../entities/inventory-item.entity';
import type { CreateInventoryItemDto } from '../dto/create-inventory-item.dto';
import type { InventoryResponse } from '../types/doctor.types';
import { parseMoney } from './doctor.utils';
import { DoctorAccessService } from './doctor-access.service';
import { ExpenseService } from './expense.service';
import { ExpenseActivityType } from '../../../entities/expense-activity.entity';

export class InventoryService {
  private readonly inventoryRepository = AppDataSource.getRepository(InventoryItem);
  private readonly accessService = new DoctorAccessService();

  private normalizeNumber(value: unknown, fieldName: string): number {
    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsed)) {
      throw new AppError(`${fieldName} must be a valid number`, 400);
    }

    return parsed;
  }

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
      gstTax: this.normalizeNumber(payload.gstTax ?? 0, 'gstTax'),
      purchasePrice: this.normalizeNumber(payload.purchasePrice ?? 0, 'purchasePrice').toFixed(2),
      unitCost: this.normalizeNumber(payload.purchasePrice ?? 0, 'purchasePrice').toFixed(2),
      sellingPrice: this.normalizeNumber(payload.sellingPrice ?? 0, 'sellingPrice').toFixed(2),
      quantity: this.normalizeNumber(payload.quantity, 'quantity'),
      minimumStockLevel: this.normalizeNumber(payload.minimumStockLevel ?? 0, 'minimumStockLevel'),
      reorderLevel: this.normalizeNumber(payload.reorderLevel ?? 0, 'reorderLevel'),
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
      
      const purchasePrice = this.normalizeNumber(payload.purchasePrice ?? 0, 'purchasePrice');
      const quantity = this.normalizeNumber(payload.quantity, 'quantity');
      const totalExpenseAmount = purchasePrice * quantity;

      if (totalExpenseAmount > 0) {
        try {
          const expenseService = new ExpenseService();
          await expenseService.createExpense({
            title: `Inventory Purchase: ${payload.itemName.trim()}`,
            category: payload.category.trim(),
            amount: totalExpenseAmount,
            date: new Date().toISOString().split('T')[0],
            notes: `Added ${quantity} units at ₹${purchasePrice.toFixed(2)} each`,
            type: ExpenseActivityType.EXPENSE,
          }, currentDoctorId);
        } catch (e) {
          console.error('Failed to log expense for new inventory item:', e);
        }
      }

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
    if (payload.purchasePrice !== undefined) {
      item.purchasePrice = this.normalizeNumber(payload.purchasePrice, 'purchasePrice').toFixed(2);
      item.unitCost = item.purchasePrice;
    }
    if (payload.sellingPrice !== undefined) {
      item.sellingPrice = this.normalizeNumber(payload.sellingPrice, 'sellingPrice').toFixed(2);
    }
    
    const savedItem = await this.inventoryRepository.save(item);

    const purchasePrice = payload.purchasePrice !== undefined 
      ? this.normalizeNumber(payload.purchasePrice, 'purchasePrice') 
      : Number(item.purchasePrice);
      
    const totalExpenseAmount = purchasePrice * payload.quantity;

    if (totalExpenseAmount > 0) {
      try {
        const expenseService = new ExpenseService();
        await expenseService.createExpense({
          title: `Inventory Restock: ${item.itemName}`,
          category: item.category,
          amount: totalExpenseAmount,
          date: new Date().toISOString().split('T')[0],
          notes: `Restocked ${payload.quantity} units at ₹${purchasePrice.toFixed(2)} each`,
          type: ExpenseActivityType.EXPENSE,
        }, currentDoctorId);
      } catch (e) {
        console.error('Failed to log expense for restocked inventory:', e);
      }
    }

    return {
      message: 'Inventory item restocked successfully',
      newQuantity: savedItem.quantity,
    };
  }
}
