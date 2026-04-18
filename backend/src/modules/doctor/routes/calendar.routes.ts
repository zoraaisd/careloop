import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { CalendarController } from '../controllers/calendar.controller';

const calendarRouter = Router();

calendarRouter.get('/', asyncHandler(CalendarController.getCalendar));

export { calendarRouter };
