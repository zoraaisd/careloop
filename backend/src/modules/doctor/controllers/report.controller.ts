import type { Request, Response } from 'express';

import { ReportService } from '../services/report.service';

const reportService = new ReportService();

export class ReportController {
  static async getReports(req: Request, res: Response): Promise<void> {
    const result = await reportService.getReports({
      dateFrom:
        typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
    }, (req as any).user?.userId);

    res.status(200).json(result);
  }
}
