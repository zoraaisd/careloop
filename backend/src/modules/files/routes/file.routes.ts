import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { FileController } from '../controllers/file.controller';

const fileRouter = Router();

fileRouter.get('/:fileId', asyncHandler(FileController.getFile));

export { fileRouter };
