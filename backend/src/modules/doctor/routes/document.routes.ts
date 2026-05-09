import { Router } from 'express';
import { PatientDocumentController } from '../controllers/patient-document.controller';
import { asyncHandler } from '../../../common/utils/async-handler';
import { upload } from '../../../common/middleware/upload.middleware';

const router = Router();

router.post('/upload', upload.single('file'), asyncHandler(PatientDocumentController.uploadDocument));
router.get('/:patientId', asyncHandler(PatientDocumentController.listDocuments));
router.delete('/:documentId', asyncHandler(PatientDocumentController.deleteDocument));

export default router;
