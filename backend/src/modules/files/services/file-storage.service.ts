import { AppError } from '../../../common/errors/app-error';
import { env } from '../../../config/env';
import { AppDataSource } from '../../../config/data-source';
import { UploadedFile } from '../../../entities/uploaded-file.entity';

export class FileStorageService {
  private get uploadedFileRepository() {
    return AppDataSource.getRepository(UploadedFile);
  }

  buildFileUrl(fileId: string): string {
    return `${env.apiPrefix}/files/${fileId}`;
  }

  async saveBuffer(params: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    buffer: Buffer;
  }): Promise<UploadedFile> {
    const file = this.uploadedFileRepository.create({
      fileName: params.fileName.trim() || 'file',
      mimeType: params.mimeType.trim() || 'application/octet-stream',
      fileSize: params.fileSize,
      fileData: params.buffer,
    });

    return await this.uploadedFileRepository.save(file);
  }

  async saveDataUrl(params: {
    fileName: string;
    dataUrl: string;
  }): Promise<UploadedFile> {
    const match = String(params.dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new AppError('Invalid file data', 400);
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    return await this.saveBuffer({
      fileName: params.fileName,
      mimeType,
      fileSize: buffer.length,
      buffer,
    });
  }

  async getFileOrThrow(fileId: string): Promise<UploadedFile> {
    const file = await this.uploadedFileRepository
      .createQueryBuilder('file')
      .addSelect('file.fileData')
      .where('file.id = :fileId', { fileId })
      .getOne();

    if (!file) {
      throw new AppError('File not found', 404);
    }

    return file;
  }

  async deleteFile(fileId?: string | null): Promise<void> {
    if (!fileId) {
      return;
    }

    await this.uploadedFileRepository.delete({ id: fileId });
  }
}
