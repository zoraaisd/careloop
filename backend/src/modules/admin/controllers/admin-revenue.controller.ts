import type { Request, Response } from 'express';

import { adminRevenueService } from '../services/admin-revenue.service';

class AdminRevenueController {
  getRevenueStatistics(_req: Request, res: Response): void {
    res.status(200).json(adminRevenueService.getRevenueStatistics());
  }
}

export const adminRevenueController = new AdminRevenueController();
