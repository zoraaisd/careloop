import type { Request, Response } from 'express';

import { InventoryService } from '../services/inventory.service';

const inventoryService = new InventoryService();

export class InventoryController {
  static async getInventory(_req: Request, res: Response): Promise<void> {
    const result = await inventoryService.getInventory();
    res.status(200).json(result);
  }

  static async createInventoryItem(req: Request, res: Response): Promise<void> {
    const result = await inventoryService.createInventoryItem(req.body);
    res.status(201).json(result);
  }

  static async deleteInventoryItem(req: Request, res: Response): Promise<void> {
    const itemId = String(req.params.itemId);
    const result = await inventoryService.deleteInventoryItem(itemId);
    res.status(200).json(result);
  }
}
