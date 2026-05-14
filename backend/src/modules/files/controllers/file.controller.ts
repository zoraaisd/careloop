import type { Request, Response } from 'express';

import { FileStorageService } from '../services/file-storage.service';

const fileStorageService = new FileStorageService();

export class FileController {
  static async getFile(req: Request, res: Response): Promise<void> {
    const file = await fileStorageService.getFileOrThrow(String(req.params.fileId));
    const shouldDownload =
      String(req.query.download ?? '').trim() === '1' ||
      String(req.query.download ?? '').trim().toLowerCase() === 'true';
    const dispositionType = shouldDownload ? 'attachment' : 'inline';

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(file.fileSize));
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${encodeURIComponent(file.fileName)}"`,
    );
    res.send(file.fileData);
  }
}
