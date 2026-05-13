import { AppDataSource } from '../../../config/data-source';
import { PatientDocument } from '../../../entities/patient-document.entity';
import { DoctorAccessService } from './doctor-access.service';
import { FileStorageService } from '../../files/services/file-storage.service';

export class PatientDocumentService {
  private readonly documentRepository = AppDataSource.getRepository(PatientDocument);
  private readonly accessService = new DoctorAccessService();
  private readonly fileStorageService = new FileStorageService();

  async uploadDocument(params: {
    patientId: string;
    doctorId: string;
    file: Express.Multer.File;
  }) {
    const storedFile = await this.fileStorageService.saveBuffer({
      fileName: params.file.originalname,
      mimeType: params.file.mimetype,
      fileSize: params.file.size,
      buffer: params.file.buffer,
    });

    const document = this.documentRepository.create({
      patientId: params.patientId,
      doctorId: params.doctorId,
      fileName: params.file.originalname,
      fileId: storedFile.id,
      fileUrl: this.fileStorageService.buildFileUrl(storedFile.id),
      fileType: params.file.mimetype,
      fileSize: params.file.size,
    });

    return await this.documentRepository.save(document);
  }

  async listDocuments(patientId: string, currentDoctorId?: string) {
    await this.accessService.ensureOwnedPatient(patientId, currentDoctorId);
    return await this.documentRepository.find({
      where: { patientId },
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

    await this.fileStorageService.deleteFile(document.fileId);
    return await this.documentRepository.remove(document);
  }
}
