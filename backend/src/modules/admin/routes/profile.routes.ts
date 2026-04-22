import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { adminProfileController } from '../controllers/admin-profile.controller';

const profileRouter = Router();

profileRouter.get('/', adminProfileController.getProfile);
profileRouter.patch('/', asyncHandler(adminProfileController.updateProfile));

export { profileRouter };
