import type { Request, Response } from 'express';

import { InventoryService } from '../services/inventory.service';

const inventoryService = new InventoryService();

export class InventoryController {
  static async getInventory(req: Request, res: Response): Promise<void> {
    const result = await inventoryService.getInventory((req as any).user?.userId);
    res.status(200).json(result);
  }

  static async createInventoryItem(req: Request, res: Response): Promise<void> {
    const result = await inventoryService.createInventoryItem(req.body, (req as any).user?.userId);
    res.status(201).json(result);
  }

  static async deleteInventoryItem(req: Request, res: Response): Promise<void> {
    const itemId = String(req.params.itemId);
    const result = await inventoryService.deleteInventoryItem(itemId, (req as any).user?.userId);
    res.status(200).json(result);
  }
}
