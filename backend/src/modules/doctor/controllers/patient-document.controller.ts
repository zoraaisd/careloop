import { Request, Response } from 'express';
import { PatientDocumentService } from '../services/patient-document.service';

const documentService = new PatientDocumentService();

export class PatientDocumentController {
  static async uploadDocument(req: Request, res: Response): Promise<void> {
    const doctorId = (req as any).user?.userId;
    const { patientId } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const result = await documentService.uploadDocument({
      patientId,
      doctorId,
      file,
    });

    res.status(201).json(result);
  }

  static async listDocuments(req: Request, res: Response): Promise<void> {
    const doctorId = (req as any).user?.userId;
    const patientId = String(req.params.patientId);
    const result = await documentService.listDocuments(patientId, doctorId);
    res.status(200).json(result);
  }

  static async deleteDocument(req: Request, res: Response): Promise<void> {
    const doctorId = (req as any).user?.userId;
    const documentId = String(req.params.documentId);
    const result = await documentService.deleteDocument(documentId, doctorId);
    res.status(200).json({ message: 'Document deleted successfully' });
  }
}
