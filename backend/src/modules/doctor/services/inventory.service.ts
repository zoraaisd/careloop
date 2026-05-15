import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import {
  InventoryItem,
  type InventoryRestockHistoryEntry,
} from '../../../entities/inventory-item.entity';
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

  private calculateTotals(quantityInput: unknown, purchasePriceInput: unknown, gstTaxInput: unknown) {
    const quantity = this.normalizeNumber(quantityInput, 'quantity');
    const purchasePrice = this.normalizeNumber(purchasePriceInput ?? 0, 'purchasePrice');
    const gstTax = this.normalizeNumber(gstTaxInput ?? 0, 'gstTax');
    const subtotal = quantity * purchasePrice;
    const taxAmount = (subtotal * gstTax) / 100;
    const totalAmount = subtotal + taxAmount;

    return { quantity, purchasePrice, gstTax, subtotal, taxAmount, totalAmount };
  }

  private buildTransactionId(prefix: 'OS' | 'RS') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  private normalizeRestockHistory(
    history: InventoryRestockHistoryEntry[] | null | undefined,
  ): InventoryRestockHistoryEntry[] {
    return Array.isArray(history) ? history : [];
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
          invoiceNumber: item.invoiceNumber,
          paymentStatus: item.paymentStatus,
          gstNumber: item.gstNumber,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate ? (typeof item.expiryDate === 'string' ? item.expiryDate : item.expiryDate.toISOString()) : null,
          subtotal: parseMoney(item.subtotal),
          taxAmount: parseMoney(item.taxAmount),
          totalAmount: parseMoney(item.totalAmount),
          restockHistory: this.normalizeRestockHistory(item.restockHistory).map((entry) => ({
            transactionId: entry.transactionId,
            transactionType: entry.transactionType,
            quantityAdded: entry.quantityAdded,
            stockAfter: entry.stockAfter,
            batchNumber: entry.batchNumber,
            purchasePrice: Number(entry.purchasePrice),
            sellingPrice: Number(entry.sellingPrice),
            entryDate: entry.entryDate,
          })),
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
    const totals = this.calculateTotals(payload.quantity, payload.purchasePrice ?? 0, payload.gstTax ?? 0);

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
      gstTax: totals.gstTax,
      purchasePrice: totals.purchasePrice.toFixed(2),
      unitCost: totals.purchasePrice.toFixed(2),
      sellingPrice: this.normalizeNumber(payload.sellingPrice ?? 0, 'sellingPrice').toFixed(2),
      quantity: totals.quantity,
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
      invoiceNumber: payload.invoiceNumber?.trim() || null,
      paymentStatus: payload.paymentStatus?.trim() || 'Pending',
      gstNumber: payload.gstNumber?.trim() || null,
      batchNumber: payload.batchNumber?.trim() || null,
      expiryDate: payload.expiryDate && payload.expiryDate.trim() !== '' ? payload.expiryDate : null,
      subtotal: totals.subtotal.toFixed(2),
      taxAmount: totals.taxAmount.toFixed(2),
      totalAmount: totals.totalAmount.toFixed(2),
      clinicId: clinicId ?? null,
      restockHistory: [
        {
          transactionId: this.buildTransactionId('OS'),
          transactionType: 'opening-stock',
          quantityAdded: totals.quantity,
          stockAfter: totals.quantity,
          batchNumber: payload.batchNumber?.trim() || null,
          purchasePrice: totals.purchasePrice,
          sellingPrice: this.normalizeNumber(payload.sellingPrice ?? 0, 'sellingPrice'),
          entryDate: new Date().toISOString(),
        },
      ],
    });

    try {
      const savedItem = await this.inventoryRepository.save(item);
      
      const totalExpenseAmount = totals.subtotal;

      if (totalExpenseAmount > 0) {
        try {
          const expenseService = new ExpenseService();
          await expenseService.createExpense({
            title: `Inventory Purchase: ${payload.itemName.trim()}`,
            category: payload.category.trim(),
            amount: totalExpenseAmount,
            date: new Date().toISOString().split('T')[0],
            notes: `Added ${totals.quantity} units at Rs.${totals.purchasePrice.toFixed(2)} each`,
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

    const existingHistory = this.normalizeRestockHistory(item.restockHistory);
    const purchasePriceForHistory = payload.purchasePrice !== undefined
      ? this.normalizeNumber(payload.purchasePrice, 'purchasePrice')
      : Number(item.purchasePrice);
    const sellingPriceForHistory = payload.sellingPrice !== undefined
      ? this.normalizeNumber(payload.sellingPrice, 'sellingPrice')
      : Number(item.sellingPrice);
    item.restockHistory = [
      {
        transactionId: this.buildTransactionId('RS'),
        transactionType: 'restock',
        quantityAdded: payload.quantity,
        stockAfter: item.quantity,
        batchNumber: payload.batchNumber?.trim() || item.batchNumber || null,
        purchasePrice: purchasePriceForHistory,
        sellingPrice: sellingPriceForHistory,
        entryDate: new Date().toISOString(),
      },
      ...existingHistory,
    ];
    
    const savedItem = await this.inventoryRepository.save(item);

    const purchasePrice = purchasePriceForHistory;
      
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
