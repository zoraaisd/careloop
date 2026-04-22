import type { Request, Response } from 'express';

import { CalendarService } from '../services/calendar.service';

const calendarService = new CalendarService();

export class CalendarController {
  static async getCalendar(req: Request, res: Response): Promise<void> {
    const result = await calendarService.getCalendar({
      doctorId:
        typeof req.query.doctorId === 'string' ? req.query.doctorId : undefined,
      dateFrom:
        typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
    }, (req as any).user?.userId);

    res.status(200).json(result);
  }
}
