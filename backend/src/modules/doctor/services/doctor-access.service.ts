import bcrypt from 'bcrypt';
import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
import { Appointment } from '../../../entities/appointment.entity';
import { Chat } from '../../../entities/chat.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { Patient } from '../../../entities/patient.entity';
import { Prescription } from '../../../entities/prescription.entity';
import { User, UserRole, DoctorApprovalStatus, SubscriptionStatus } from '../../../entities/user.entity';
import { authEmailService } from '../../auth/services/auth-email.service';
import { DoctorPortalAccessService } from './doctor-portal-access.service';
import type { DoctorPortalAccessSnapshot } from '../types/access.types';

export class DoctorAccessService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly appointmentRepository = AppDataSource.getRepository(Appointment);
  private readonly prescriptionRepository = AppDataSource.getRepository(Prescription);
  private readonly chatRepository = AppDataSource.getRepository(Chat);
  private readonly portalAccessService = new DoctorPortalAccessService();

  ensureAuthenticatedDoctorId(currentDoctorId?: string): string {
    if (!currentDoctorId) {
      throw new AppError('Authenticated doctor context is required', 401);
    }

    return currentDoctorId;
  }

  async ensureCurrentDoctor(currentDoctorId?: string): Promise<User> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const doctor = await this.userRepository.findOne({
      where: { id: doctorId, role: UserRole.DOCTOR },
    });

    if (!doctor) {
      throw new AppError('Doctor account not found', 404);
    }

    return doctor;
  }

  async getAccessState(currentDoctorId?: string): Promise<DoctorPortalAccessSnapshot> {
    const doctor = await this.ensureCurrentDoctor(currentDoctorId);
    const snapshot = this.portalAccessService.buildAccessSnapshot(doctor);
    
    if (doctor.role === UserRole.DOCTOR) {
      const profileRepo = AppDataSource.getRepository('doctor_profiles');
      const profile = await profileRepo.findOne({ where: { user_id: doctor.id } }) as any;
      if (profile && profile.clinic_id) {
        snapshot.clinicId = profile.clinic_id;
      }
    }
    
    return snapshot;
  }

  async inviteDoctor(currentDoctorId: string, payload: any): Promise<any> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    
    const profileRepo = AppDataSource.getRepository(DoctorProfile);
    const existingProfile = await profileRepo.findOne({ where: { userId: doctorId } });
    
    if (!existingProfile || !existingProfile.clinicId) {
      throw new AppError('Only doctors with an approved clinic ID can invite other doctors', 403);
    }

    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOne({ where: { email } });
    
    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    const password = await bcrypt.hash(payload.password, 12);

    await AppDataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const doctorProfiles = manager.getRepository(DoctorProfile);
      
      const now = new Date();
      
      const user = users.create({
        name: payload.name.trim(),
        email,
        phone: payload.phone.trim(),
        password,
        role: UserRole.DOCTOR,
        approvalStatus: DoctorApprovalStatus.PENDING,
        trialStartedAt: now,
        trialEndsAt: new Date(now.getTime() + 0), // 0 days trial by default
        subscriptionStatus: SubscriptionStatus.INACTIVE,
      });

      const createdUser = await users.save(user);

      const profile = doctorProfiles.create({
        userId: createdUser.id,
        specialization: payload.specialization.trim(),
        experience: payload.experience,
        qualification: payload.qualification.trim(),
        medicalRegistrationNumber: payload.medicalRegistrationNumber.trim(),
        medicalCouncilBoard: payload.medicalCouncilBoard.trim(),
        councilRegisteredName: payload.councilRegisteredName.trim(),
        dateOfBirth: payload.dateOfBirth,
        clinicName: existingProfile.clinicName,
        clinicAddress: existingProfile.clinicAddress,
        city: existingProfile.city,
        clinicId: existingProfile.clinicId,
        consultationFees: payload.consultationFees.toFixed(2),
        availableDays: payload.availableDays.split(',').map((d: string) => d.trim()),
        availableTimeSlots: payload.availableTimeSlots.split(',').map((s: string) => s.trim()),
        aboutDoctor: null,
        profileImageUrl: null,
        certificateUrl: null,
      });

      await doctorProfiles.save(profile);
    });

    void authEmailService.sendDoctorInviteEmail({
      name: payload.name.trim(),
      email,
      rawPassword: payload.password,
      clinicName: existingProfile.clinicName,
    });

    return { message: 'Doctor invited successfully' };
  }

  async ensureDoctorPortalAccess(currentDoctorId?: string): Promise<User> {
    const doctor = await this.ensureCurrentDoctor(currentDoctorId);
    const accessState = this.portalAccessService.buildAccessSnapshot(doctor);

    if (!accessState.canAccessPortal) {
      throw new AppError(accessState.message, 403, accessState);
    }

    return doctor;
  }

  async ensureManagedDoctor(
    targetDoctorId: string,
    currentDoctorId?: string,
  ): Promise<User> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);

    if (doctorId !== targetDoctorId) {
      throw new AppError('Forbidden: you can only access your own doctor records', 403);
    }

    return this.ensureCurrentDoctor(doctorId);
  }

  async ensureOwnedPatient(
    patientId: string,
    currentDoctorId?: string,
  ): Promise<Patient> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const patient = await this.patientRepository.findOne({
      where: {
        id: patientId,
        isActive: true,
        primaryDoctorId: doctorId,
      },
    });

    if (!patient) {
      throw new AppError('Patient not found or not assigned to this doctor', 404);
    }

    return patient;
  }

  async ensureOwnedAppointment(
    appointmentId: string,
    currentDoctorId?: string,
  ): Promise<Appointment> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, doctorId },
      relations: { patient: true, doctor: true },
    });

    if (!appointment) {
      throw new AppError('Appointment not found or not assigned to this doctor', 404);
    }

    return appointment;
  }

  async ensureOwnedPrescription(
    prescriptionId: string,
    currentDoctorId?: string,
  ): Promise<Prescription> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const prescription = await this.prescriptionRepository.findOne({
      where: { id: prescriptionId, doctorId },
      relations: { patient: true, doctor: true, medicines: true },
    });

    if (!prescription) {
      throw new AppError('Prescription not found or not assigned to this doctor', 404);
    }

    return prescription;
  }

  async ensureOwnedChat(chatId: string, currentDoctorId?: string): Promise<Chat> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const chat = await this.chatRepository.findOne({
      where: { id: chatId, doctorId },
      relations: { patient: true },
    });

    if (!chat) {
      throw new AppError('Chat not found or not assigned to this doctor', 404);
    }

    return chat;
  }
}
