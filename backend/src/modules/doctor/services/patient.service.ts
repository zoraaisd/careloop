import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
import { Patient, PatientVerificationStatus } from '../../../entities/patient.entity';
import { ChatMessageType, ChatSenderType } from '../../../entities/chat-message.entity';
import type { CreatePatientDto } from '../dto/create-patient.dto';
import type { PatientListResponse } from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import { DoctorSupportService } from './doctor-support.service';
import { formatDate } from './doctor.utils';

export class PatientService {
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly supportService = new DoctorSupportService();
  private readonly accessService = new DoctorAccessService();

  async listPatients(currentDoctorId?: string): Promise<PatientListResponse> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const patients = await this.patientRepository.find({
      where: { isActive: true, primaryDoctorId: doctorId },
      order: { createdAt: 'DESC' },
    });

    return {
      total: patients.length,
      items: patients.map((patient) => ({
        patientId: patient.id,
        name: patient.name,
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
      primaryDoctorId: doctor.id,
      verificationStatus: PatientVerificationStatus.PENDING,
      whatsappVerified: false,
      isActive: true,
    });

    const savedPatient = await this.patientRepository.save(patient);
    const chat = await this.supportService.ensureChatForPatient(
      savedPatient.id,
      doctor.id,
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

  async deactivatePatient(patientId: string, doctorId?: string): Promise<{ message: string }> {
    const patient = await this.accessService.ensureOwnedPatient(patientId, doctorId);

    patient.isActive = false;
    await this.patientRepository.save(patient);

    await this.supportService.logActivity({
      doctorId: doctorId ?? null,
      patientId,
      type: 'patient-deactivated',
      message: `Patient ${patient.name} was deactivated.`,
    });

    return { message: 'Patient deactivated successfully' };
  }
}
