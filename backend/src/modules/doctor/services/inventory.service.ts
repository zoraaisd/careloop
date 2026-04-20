import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import { InventoryItem } from '../../../entities/inventory-item.entity';
import type { CreateInventoryItemDto } from '../dto/create-inventory-item.dto';
import type { InventoryResponse } from '../types/doctor.types';
import { parseMoney } from './doctor.utils';

export class InventoryService {
  private readonly inventoryRepository = AppDataSource.getRepository(InventoryItem);

  async getInventory(): Promise<InventoryResponse> {
    const items = await this.inventoryRepository.find({
      order: { createdAt: 'DESC' },
    });

    return {
      summary: {
        itemsCount: items.length,
        totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
        lowStockCount: items.filter((item) => item.quantity <= item.reorderLevel)
          .length,
        stockValue: items.reduce(
          (sum, item) => sum + item.quantity * parseMoney(item.unitCost),
          0,
        ),
      },
      items: items.map((item) => ({
        inventoryItemId: item.id,
        itemName: item.itemName,
        category: item.category,
        stockQuantity: item.quantity,
        stockUnit: item.unit,
        reorderLevel: item.reorderLevel,
        unitCost: parseMoney(item.unitCost),
        vendor: item.vendor,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
  }

  async createInventoryItem(
    payload: CreateInventoryItemDto,
  ): Promise<{ message: string; inventoryItemId: string }> {
    const item = this.inventoryRepository.create({
      itemName: payload.itemName.trim(),
      category: payload.category.trim(),
      vendor: payload.vendor?.trim() ?? null,
      quantity: payload.quantity,
      unit: payload.unit.trim(),
      reorderLevel: payload.reorderLevel,
      unitCost: payload.unitCost.toFixed(2),
    });

    const savedItem = await this.inventoryRepository.save(item);

    return {
      message: 'Inventory item created successfully',
      inventoryItemId: savedItem.id,
    };
  }

  async deleteInventoryItem(itemId: string): Promise<{ message: string }> {
    const item = await this.inventoryRepository.findOne({ where: { id: itemId } });

    if (!item) {
      throw new AppError('Inventory item not found', 404);
    }

    await this.inventoryRepository.remove(item);
    return { message: 'Inventory item deleted successfully' };
  }
}
