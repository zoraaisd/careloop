import { MoreThan } from 'typeorm';

import { AppDataSource } from '../../../config/data-source';
import { ActivityLog } from '../../../entities/activity-log.entity';
import {
  Appointment,
} from '../../../entities/appointment.entity';
import { Chat } from '../../../entities/chat.entity';
import { Prescription } from '../../../entities/prescription.entity';
import { Patient, PatientVerificationStatus } from '../../../entities/patient.entity';
import { User } from '../../../entities/user.entity';
import type { DashboardResponse } from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import {
  formatDate,
  formatDateOnly,
  getInitials,
} from './doctor.utils';

export class DoctorDashboardService {
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly appointmentRepository = AppDataSource.getRepository(Appointment);
  private readonly prescriptionRepository = AppDataSource.getRepository(Prescription);
  private readonly chatRepository = AppDataSource.getRepository(Chat);
  private readonly activityRepository = AppDataSource.getRepository(ActivityLog);
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly accessService = new DoctorAccessService();

  async getDashboard(currentDoctorId?: string): Promise<DashboardResponse> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const today = new Date().toISOString().slice(0, 10);
    const [
      totalPatients,
      waVerifiedCount,
      appointmentsCount,
      prescriptionsCount,
      recentActivities,
      todaysAppointments,
      pendingPatientChats,
      currentDoctor,
    ] = await Promise.all([
      this.patientRepository.count({ where: { isActive: true, primaryDoctorId: doctorId } }),
      this.patientRepository.count({
        where: {
          isActive: true,
          primaryDoctorId: doctorId,
          verificationStatus: PatientVerificationStatus.VERIFIED,
          whatsappVerified: true,
        },
      }),
      this.appointmentRepository.count({ where: { doctorId } }),
      this.prescriptionRepository.count({ where: { doctorId } }),
      this.activityRepository.find({
        where: { doctorId },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.appointmentRepository.find({
        where: { appointmentDate: today, doctorId },
        relations: { patient: true, doctor: true },
        order: { appointmentTime: 'ASC' },
        take: 10,
      }),
      this.chatRepository.find({
        relations: { patient: true },
        where: { unreadCount: MoreThan(0), doctorId },
        order: { lastMessageAt: 'DESC' },
        take: 10,
      }),
      this.userRepository.findOne({ where: { id: doctorId } }),
    ]);

    const waMessagesSentCount = recentActivities.filter(
      (item) => item.type === 'whatsapp-message',
    ).length;

    return {
      summary: {
        totalPatients,
        waVerifiedCount,
        appointmentsCount,
        prescriptionsCount,
        unreadPatientChatsCount: pendingPatientChats.reduce(
          (total, chat) => total + chat.unreadCount,
          0,
        ),
        waMessagesSentCount,
      },
      metricCards: [
        {
          label: 'Total Patients',
          value: totalPatients,
          helperText: 'Active patient records',
        },
        {
          label: 'WA Verified',
          value: waVerifiedCount,
          helperText: 'Verified WhatsApp profiles',
        },
        {
          label: 'Appointments',
          value: appointmentsCount,
          helperText: 'Booked consultations',
        },
        {
          label: 'Prescriptions',
          value: prescriptionsCount,
          helperText: 'Issued prescription count',
        },
        {
          label: 'Patient Chats',
          value: pendingPatientChats.length,
          helperText: 'Pending unread conversations',
        },
        {
          label: 'WA Messages',
          value: waMessagesSentCount,
          helperText: 'Tracked outbound activity',
        },
      ],
      recentActivities: recentActivities.map((activity) => ({
        activityId: activity.id,
        type: activity.type,
        message: activity.message,
        direction: activity.direction,
        createdAt: activity.createdAt.toISOString(),
      })),
      pendingPatientChats: pendingPatientChats.map((chat) => ({
        chatId: chat.id,
        patientId: chat.patientId,
        patientName: chat.patient.name,
        lastMessage: chat.lastMessage ?? '',
        unreadCount: chat.unreadCount,
        lastMessageAt: formatDate(chat.lastMessageAt),
      })),
      todaysAppointments: todaysAppointments.map((appointment) => ({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        patientName: appointment.patient.name,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctor.name,
        date: formatDateOnly(appointment.appointmentDate),
        time: appointment.appointmentTime,
        status: appointment.status,
      })),
      currentDoctor: currentDoctor
        ? {
            doctorId: currentDoctor.id,
            doctorName: currentDoctor.name,
            doctorInitials: getInitials(currentDoctor.name),
            role: currentDoctor.role,
          }
        : null,
    };
  }
}
