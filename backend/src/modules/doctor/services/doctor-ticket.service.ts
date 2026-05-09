import { AppDataSource } from '../../../config/data-source';
import { SupportTicket, SupportTicketStatus, SupportTicketPriority } from '../../../entities/support-ticket.entity';
import { DoctorAccessService } from './doctor-access.service';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';

export class DoctorTicketService {
  private readonly ticketRepository = AppDataSource.getRepository(SupportTicket);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly accessService = new DoctorAccessService();

  async createTicket(payload: {
    issueTitle: string;
    description: string;
    priority: SupportTicketPriority;
  }, currentDoctorId?: string, file?: Express.Multer.File) {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    
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
      attachmentUrl: file ? `/uploads/documents/${file.filename}` : null,
      attachmentName: file ? file.originalname : null,
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
