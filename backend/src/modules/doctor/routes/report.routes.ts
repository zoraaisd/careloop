import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { ReportController } from '../controllers/report.controller';

const reportRouter = Router();

reportRouter.get('/export', asyncHandler(ReportController.exportReports));
reportRouter.get('/view', asyncHandler(ReportController.getReportView));
reportRouter.get('/', asyncHandler(ReportController.getReports));

export { reportRouter };
