import { Router } from 'express';

import { upload } from '../../../common/middleware/upload.middleware';
import { asyncHandler } from '../../../common/utils/async-handler';
import { adminProfileController } from '../controllers/admin-profile.controller';

const profileRouter = Router();

profileRouter.get('/', adminProfileController.getProfile);
profileRouter.patch(
  '/',
  upload.single('profileImage'),
  asyncHandler(adminProfileController.updateProfile),
);

export { profileRouter };
