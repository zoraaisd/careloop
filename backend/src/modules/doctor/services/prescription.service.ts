import { AppDataSource } from '../../../config/data-source';
import { ChatMessageType, ChatSenderType } from '../../../entities/chat-message.entity';
import { Prescription } from '../../../entities/prescription.entity';
import { PrescriptionMedicine } from '../../../entities/prescription-medicine.entity';
import type { CreatePrescriptionDto } from '../dto/create-prescription.dto';
import type { PrescriptionListResponse } from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import { DoctorSupportService } from './doctor-support.service';
import { formatDate, formatDateOnly } from './doctor.utils';

export class PrescriptionService {
  private readonly prescriptionRepository = AppDataSource.getRepository(Prescription);
  private readonly medicineRepository = AppDataSource.getRepository(PrescriptionMedicine);
  private readonly supportService = new DoctorSupportService();
  private readonly accessService = new DoctorAccessService();

  async listPrescriptions(currentDoctorId?: string): Promise<PrescriptionListResponse> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const prescriptions = await this.prescriptionRepository.find({
      where: { doctorId },
      relations: { patient: true, doctor: true, medicines: true },
      order: { prescriptionDate: 'DESC', createdAt: 'DESC' },
    });

    return {
      total: prescriptions.length,
      items: prescriptions.map((prescription) => ({
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        doctorId: prescription.doctorId,
        patientName: prescription.patient.name,
        doctorName: prescription.doctor.name,
        diagnosis: prescription.diagnosis,
        medicines: prescription.medicines.map((medicine) => ({
          medicineName: medicine.medicineName,
          dosage: medicine.dosage,
          instruction: medicine.instruction,
        })),
        medicinesSummary: prescription.medicines
          .map((medicine) => `${medicine.medicineName} ${medicine.dosage}`)
          .join(', '),
        notes: prescription.notes,
        prescriptionDate: formatDateOnly(prescription.prescriptionDate),
        pdfUrl: prescription.pdfUrl,
        sentAt: formatDate(prescription.sentAt),
        resendCount: prescription.resendCount,
      })),
    };
  }

  async createPrescription(
    payload: CreatePrescriptionDto,
    currentDoctorId?: string,
  ): Promise<{ message: string; prescriptionId: string }> {
    const doctor = await this.accessService.ensureManagedDoctor(
      payload.doctorId,
      currentDoctorId,
    );
    const patient = await this.accessService.ensureOwnedPatient(
      payload.patientId,
      currentDoctorId,
    );

    const prescription = this.prescriptionRepository.create({
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      diagnosis: payload.diagnosis.trim(),
      notes: payload.notes?.trim() ?? null,
      prescriptionDate: payload.prescriptionDate ?? new Date().toISOString().slice(0, 10),
      pdfUrl: payload.pdfUrl?.trim() ?? null,
      sentAt: new Date(),
      medicines: payload.medicines.map((medicine) =>
        this.medicineRepository.create({
          medicineName: medicine.medicineName.trim(),
          dosage: medicine.dosage.trim(),
          instruction: medicine.instruction.trim(),
        }),
      ),
    });

    const savedPrescription = await this.prescriptionRepository.save(prescription);
    const chat = await this.supportService.ensureChatForPatient(patient.id, payload.doctorId);
    const medicinesText = payload.medicines
      .map(
        (medicine) =>
          `${medicine.medicineName} ${medicine.dosage} (${medicine.instruction})`,
      )
      .join(', ');

    await this.supportService.appendChatMessage({
      chatId: chat.id,
      senderType: ChatSenderType.SYSTEM,
      messageType: ChatMessageType.PRESCRIPTION,
      content: `New prescription from ${doctor.name}. Diagnosis: ${payload.diagnosis}. ${medicinesText}.`,
      attachmentUrl: payload.pdfUrl ?? null,
      direction: 'outbound',
    });

    await this.supportService.logActivity({
      doctorId: doctor.id,
      patientId: payload.patientId,
      type: 'prescription-sent',
      message: `Prescription sent to ${patient.name} by ${doctor.name}.`,
    });

    return {
      message: 'Prescription created successfully',
      prescriptionId: savedPrescription.id,
    };
  }

  async resendPrescription(
    prescriptionId: string,
    currentDoctorId?: string,
  ): Promise<{ message: string }> {
    const prescription = await this.accessService.ensureOwnedPrescription(
      prescriptionId,
      currentDoctorId,
    );

    prescription.resendCount += 1;
    prescription.sentAt = new Date();
    await this.prescriptionRepository.save(prescription);

    const chat = await this.supportService.ensureChatForPatient(
      prescription.patientId,
      prescription.doctorId,
    );
    await this.supportService.appendChatMessage({
      chatId: chat.id,
      senderType: ChatSenderType.SYSTEM,
      messageType: ChatMessageType.PRESCRIPTION,
      content: `Prescription resent for ${prescription.patient.name}.`,
      attachmentUrl: prescription.pdfUrl,
      direction: 'outbound',
    });
    await this.supportService.logActivity({
      doctorId: prescription.doctorId,
      patientId: prescription.patientId,
      type: 'whatsapp-message',
      message: `Prescription resent to ${prescription.patient.name}.`,
    });

    return { message: 'Prescription resent successfully' };
  }
}
