import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
import { Patient, PatientVerificationStatus } from '../../../entities/patient.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { User, UserRole } from '../../../entities/user.entity';
import { ChatMessageType, ChatSenderType } from '../../../entities/chat-message.entity';
import type { CreatePatientDto } from '../dto/create-patient.dto';
import type { UpdatePatientDto } from '../dto/update-patient.dto';
import type { PatientListResponse } from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import { DoctorSupportService } from './doctor-support.service';
import { formatDate } from './doctor.utils';
import { adminBillingService } from '../../admin/services/admin-billing.service';

export class PatientService {
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly supportService = new DoctorSupportService();
  private readonly accessService = new DoctorAccessService();

  async listPatients(currentDoctorId?: string): Promise<PatientListResponse> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const patients = await this.patientRepository.find({
      where: { isActive: true, primaryDoctorId: doctorId },
      relations: { primaryDoctor: true },
      order: { createdAt: 'DESC' },
    });

    return {
      total: patients.length,
      items: patients.map((patient) => ({
        patientId: patient.id,
        name: patient.name,
        doctorName: patient.primaryDoctor?.name ?? null,
        phone: patient.phone,
        age: patient.age,
        email: patient.email,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        condition: patient.condition,
        notes: patient.notes,
        verificationStatus: patient.verificationStatus,
        whatsappVerified: patient.whatsappVerified,
        createdAt: patient.createdAt.toISOString(),
        lastVisitAt: formatDate(patient.lastVisitAt),
        isActive: patient.isActive,
        actions: {
          canSendOtp: !patient.whatsappVerified,
          canOpenProfile: true,
          canSendSlots: true,
          canOpenChat: true,
          canDeactivate: true,
        },
      })),
    };
  }

  async createPatient(
    payload: CreatePatientDto,
    currentDoctorId?: string,
  ): Promise<{ message: string; patientId: string }> {
    const doctor = await this.accessService.ensureCurrentDoctor(currentDoctorId);
    
    // Identify assigned doctor first to check their limit
    let assignedDoctorId = doctor.id;
    if (payload.primaryDoctorId && payload.primaryDoctorId !== doctor.id) {
      assignedDoctorId = payload.primaryDoctorId;
    }

    const assignedDoctor = await this.userRepository.findOne({ where: { id: assignedDoctorId } });
    if (!assignedDoctor) {
      throw new AppError('Assigned doctor not found', 404);
    }

    // Fetch limits from adminBillingService
    const plans = await adminBillingService.getPlans();
    const activePlan = plans.find(p => p.id === assignedDoctor.subscribedPlanId);
    
    // Default limit for trials (unsubscribed) is 3 patients
    const limit = activePlan ? activePlan.patientsLimit : 3;

    const currentPatientCount = await this.patientRepository.count({
      where: { primaryDoctorId: assignedDoctorId, isActive: true },
    });

    if (currentPatientCount >= limit) {
      throw new AppError(`Patient limit reached (${currentPatientCount}/${limit}) for the assigned doctor. Please upgrade the plan to add more patients.`, 403);
    }

    if (payload.primaryDoctorId && payload.primaryDoctorId !== doctor.id) {
      const [currentProfile, targetDoctor, targetProfile] = await Promise.all([
        this.doctorProfileRepository.findOne({ where: { userId: doctor.id }, select: ['clinicId', 'clinicName', 'clinicAddress', 'city'] }),
        this.userRepository.findOne({ where: { id: payload.primaryDoctorId, role: UserRole.DOCTOR }, select: ['id'] }),
        this.doctorProfileRepository.findOne({ where: { userId: payload.primaryDoctorId }, select: ['clinicId', 'clinicName', 'clinicAddress', 'city'] }),
      ]);

      if (!targetDoctor) {
        throw new AppError('Selected doctor not found', 404);
      }

      const sameClinicById = Boolean(
        currentProfile?.clinicId &&
          targetProfile?.clinicId &&
          currentProfile.clinicId === targetProfile.clinicId,
      );
      const sameClinicByDetails = Boolean(
        currentProfile?.clinicName &&
          currentProfile?.clinicAddress &&
          currentProfile?.city &&
          targetProfile?.clinicName &&
          targetProfile?.clinicAddress &&
          targetProfile?.city &&
          currentProfile.clinicName === targetProfile.clinicName &&
          currentProfile.clinicAddress === targetProfile.clinicAddress &&
          currentProfile.city === targetProfile.city,
      );

      if (!sameClinicById && !sameClinicByDetails) {
        throw new AppError('Selected doctor must belong to the same clinic', 400);
      }

      assignedDoctorId = targetDoctor.id;
    }

    const existingPatient = await this.patientRepository.findOne({
      where: { phone: payload.phone.trim() },
    });

    if (existingPatient) {
      throw new AppError('Patient phone number is already registered', 409);
    }

    const patient = this.patientRepository.create({
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      age: payload.age,
      email: payload.email?.trim().toLowerCase() ?? null,
      gender: payload.gender?.trim() ?? null,
      bloodGroup: payload.bloodGroup?.trim() ?? null,
      condition: payload.condition?.trim() ?? null,
      notes: payload.notes?.trim() ?? null,
      primaryDoctorId: assignedDoctorId,
      verificationStatus: PatientVerificationStatus.PENDING,
      whatsappVerified: false,
      isActive: true,
    });

    const savedPatient = await this.patientRepository.save(patient);
    const chat = await this.supportService.ensureChatForPatient(
      savedPatient.id,
      assignedDoctorId,
    );

    await this.supportService.appendChatMessage({
      chatId: chat.id,
      senderType: ChatSenderType.SYSTEM,
      messageType: ChatMessageType.TEXT,
      content: `Welcome to HealthBot, ${savedPatient.name}. Your patient profile has been created.`,
      direction: 'outbound',
    });

    await this.supportService.logActivity({
      doctorId: doctor.id,
      patientId: savedPatient.id,
      type: 'patient-created',
      message: `Patient ${savedPatient.name} added and welcome WhatsApp message queued.`,
    });

    return {
      message: 'Patient created successfully',
      patientId: savedPatient.id,
    };
  }

  async sendOtp(patientId: string, doctorId?: string): Promise<{ message: string }> {
    const patient = await this.accessService.ensureOwnedPatient(patientId, doctorId);
    const chat = await this.supportService.ensureChatForPatient(patient.id, doctorId ?? null);

    await this.supportService.appendChatMessage({
      chatId: chat.id,
      senderType: ChatSenderType.SYSTEM,
      messageType: ChatMessageType.TEXT,
      content: `OTP sent to ${patient.phone} for WhatsApp verification.`,
      direction: 'outbound',
    });

    await this.supportService.logActivity({
      doctorId: doctorId ?? null,
      patientId: patient.id,
      type: 'whatsapp-message',
      message: `Verification OTP sent to ${patient.name}.`,
    });

    return { message: 'OTP sent successfully' };
  }

  async sendSlots(patientId: string, doctorId?: string): Promise<{ message: string }> {
    const patient = await this.accessService.ensureOwnedPatient(patientId, doctorId);
    const chat = await this.supportService.ensureChatForPatient(patient.id, doctorId ?? null);

    await this.supportService.appendChatMessage({
      chatId: chat.id,
      senderType: ChatSenderType.DOCTOR,
      messageType: ChatMessageType.SLOT,
      content: 'Available consultation slots have been shared with the patient.',
      direction: 'outbound',
    });

    await this.supportService.logActivity({
      doctorId: doctorId ?? null,
      patientId: patient.id,
      type: 'whatsapp-message',
      message: `Available slots sent to ${patient.name}.`,
    });

    return { message: 'Appointment slots sent successfully' };
  }

  async updatePatient(
    patientId: string,
    payload: UpdatePatientDto,
    doctorId?: string,
  ): Promise<{ message: string }> {
    const patient = await this.accessService.ensureOwnedPatient(patientId, doctorId);

    if (payload.phone && payload.phone.trim() !== patient.phone) {
      const existingPatient = await this.patientRepository.findOne({
        where: { phone: payload.phone.trim() },
      });
      if (existingPatient && existingPatient.id !== patient.id) {
        throw new AppError('Patient phone number is already registered', 409);
      }
      patient.phone = payload.phone.trim();
    }

    if (payload.name !== undefined) patient.name = payload.name.trim();
    if (payload.age !== undefined) patient.age = payload.age;
    if (payload.email !== undefined) patient.email = payload.email?.trim().toLowerCase() || null;
    if (payload.gender !== undefined) patient.gender = payload.gender?.trim() || null;
    if (payload.bloodGroup !== undefined) patient.bloodGroup = payload.bloodGroup?.trim() || null;
    if (payload.condition !== undefined) patient.condition = payload.condition?.trim() || null;
    if (payload.notes !== undefined) patient.notes = payload.notes?.trim() || null;

    if (payload.primaryDoctorId !== undefined) {
      if (!payload.primaryDoctorId) {
        patient.primaryDoctorId = null;
      } else {
        const doctor = await this.userRepository.findOne({
          where: { id: payload.primaryDoctorId, role: UserRole.DOCTOR },
        });
        if (!doctor) {
          throw new AppError('Selected doctor not found', 404);
        }
        patient.primaryDoctorId = doctor.id;
      }
    }

    await this.patientRepository.save(patient);

    return { message: 'Patient updated successfully' };
  }

  async deletePatient(patientId: string, doctorId?: string): Promise<{ message: string }> {
    const patient = await this.accessService.ensureOwnedPatient(patientId, doctorId);

    // Physically delete the patient record from the database
    await this.patientRepository.remove(patient);

    await this.supportService.logActivity({
      doctorId: doctorId ?? null,
      patientId,
      type: 'patient-deleted',
      message: `Patient ${patient.name} was permanently deleted from the database.`,
    });

    return { message: 'Patient deleted successfully' };
  }
}
