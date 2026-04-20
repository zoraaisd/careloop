import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { AuthController } from '../controllers/auth.controller';

const authRouter = Router();

authRouter.post('/signup', asyncHandler(AuthController.signup));
authRouter.post('/login', asyncHandler(AuthController.login));

export { authRouter };
