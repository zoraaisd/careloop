import { AppDataSource } from '../../../config/data-source';
import { SupportTicket, SupportTicketStatus, SupportTicketPriority } from '../../../entities/support-ticket.entity';
import { DoctorAccessService } from './doctor-access.service';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { FileStorageService } from '../../files/services/file-storage.service';

export class DoctorTicketService {
  private readonly ticketRepository = AppDataSource.getRepository(SupportTicket);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly accessService = new DoctorAccessService();
  private readonly fileStorageService = new FileStorageService();

  async createTicket(payload: {
    issueTitle: string;
    description: string;
    priority: SupportTicketPriority;
  }, currentDoctorId?: string, file?: any) {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const storedFile = file
      ? await this.fileStorageService.saveBuffer({
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          buffer: file.buffer,
        })
      : null;
    
    // Fetch doctor profile to get clinic info
    const profile = await this.doctorProfileRepository.findOne({
      where: { userId: doctorId },
      relations: { user: true }
    });

    const ticket = this.ticketRepository.create({
      doctorId: doctorId,
      clinicName: profile?.clinicName || 'Unknown Clinic',
      issueTitle: payload.issueTitle.trim(),
      description: payload.description.trim(),
      priority: payload.priority,
      status: SupportTicketStatus.OPEN,
      clinicEmail: profile?.user?.email || null,
      clinicPhone: profile?.clinicPhone || null,
      attachmentUrl: storedFile ? this.fileStorageService.buildFileUrl(storedFile.id) : null,
      attachmentName: file ? file.originalname : null,
      attachmentFileId: storedFile?.id ?? null,
      attachmentType: file?.mimetype ?? null,
      attachmentSize: file?.size ?? null,
    });

    return await this.ticketRepository.save(ticket);
  }

  async getMyTickets(currentDoctorId?: string) {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    return await this.ticketRepository.find({
      where: { doctorId },
      order: { createdAt: 'DESC' }
    });
  }
}
