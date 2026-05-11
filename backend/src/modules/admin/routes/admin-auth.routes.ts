import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { AdminAuthController } from '../controllers/admin-auth.controller';

const adminAuthRouter = Router();

adminAuthRouter.post('/login', asyncHandler(AdminAuthController.login));

export { adminAuthRouter };
