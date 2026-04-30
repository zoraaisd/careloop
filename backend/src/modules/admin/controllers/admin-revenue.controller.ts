import type { Request, Response } from 'express';

import { adminRevenueService } from '../services/admin-revenue.service';

class AdminRevenueController {
  async getRevenueStatistics(_req: Request, res: Response): Promise<void> {
    res.status(200).json(await adminRevenueService.getRevenueStatistics());
  }
}

export const adminRevenueController = new AdminRevenueController();
