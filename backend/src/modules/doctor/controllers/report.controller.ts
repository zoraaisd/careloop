import type { Request, Response } from 'express';

import { ReportService } from '../services/report.service';

const reportService = new ReportService();

const readQueryString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const readExportFormat = (value: unknown): 'csv' | 'sheet' | 'pdf' => {
  if (value === 'sheet' || value === 'pdf' || value === 'csv') {
    return value;
  }

  return 'csv';
};

export class ReportController {
  static async getReports(req: Request, res: Response): Promise<void> {
    const result = await reportService.getReports(
      {
        dateFrom: readQueryString(req.query.dateFrom),
        dateTo: readQueryString(req.query.dateTo),
        doctorId: readQueryString(req.query.doctorId),
      },
      (req as any).user?.userId,
    );

    res.status(200).json(result);
  }

  static async getReportView(req: Request, res: Response): Promise<void> {
    const result = await reportService.getReportView(
      {
        reportType:
          typeof req.query.reportType === 'string'
            ? (req.query.reportType as 'patient' | 'revenue' | 'inventory' | 'expenses')
            : undefined,
        dateFrom: readQueryString(req.query.dateFrom),
        dateTo: readQueryString(req.query.dateTo),
        doctorId: readQueryString(req.query.doctorId),
        patientId: readQueryString(req.query.patientId),
      },
      (req as any).user?.userId,
    );

    res.status(200).json(result);
  }

  static async exportReports(req: Request, res: Response): Promise<void> {
    const result = await reportService.exportReport(
      {
        reportType:
          typeof req.query.reportType === 'string'
            ? (req.query.reportType as 'patient' | 'revenue' | 'inventory' | 'expenses')
            : undefined,
        dateFrom: readQueryString(req.query.dateFrom),
        dateTo: readQueryString(req.query.dateTo),
        doctorId: readQueryString(req.query.doctorId),
        patientId: readQueryString(req.query.patientId),
      },
      (req as any).user?.userId,
      readExportFormat(req.query.format),
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    res.status(200).send(result.content);
  }
}
