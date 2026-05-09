import { AppDataSource } from '../../../config/data-source';
import { PatientDocument } from '../../../entities/patient-document.entity';
import { DoctorAccessService } from './doctor-access.service';
import fs from 'fs';
import path from 'path';

export class PatientDocumentService {
  private readonly documentRepository = AppDataSource.getRepository(PatientDocument);
  private readonly accessService = new DoctorAccessService();

  async uploadDocument(params: {
    patientId: string;
    doctorId: string;
    file: Express.Multer.File;
  }) {
    const document = this.documentRepository.create({
      patientId: params.patientId,
      doctorId: params.doctorId,
      fileName: params.file.originalname,
      fileUrl: `/uploads/documents/${params.file.filename}`,
      fileType: params.file.mimetype,
      fileSize: params.file.size,
    });

    return await this.documentRepository.save(document);
  }

  async listDocuments(patientId: string, currentDoctorId?: string) {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    return await this.documentRepository.find({
      where: { patientId, doctorId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteDocument(documentId: string, currentDoctorId?: string) {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const document = await this.documentRepository.findOne({
      where: { id: documentId, doctorId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Delete from filesystem
    const filePath = path.join(process.cwd(), document.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return await this.documentRepository.remove(document);
  }
}
