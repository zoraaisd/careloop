import { AppDataSource } from '../../../config/data-source';
import { Patient } from '../../../entities/patient.entity';
import { PatientPayment, PaymentMethod } from '../../../entities/patient-payment.entity';
import { DoctorAccessService } from './doctor-access.service';
import { DoctorSupportService } from './doctor-support.service';

export type CreatePaymentDto = {
  patientId: string;
  patientFee: number;
  consultationFee: number;
  paymentMethod: PaymentMethod;
  notes?: string;
};

export class PatientPaymentService {
  private readonly paymentRepository = AppDataSource.getRepository(PatientPayment);
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly accessService = new DoctorAccessService();
  private readonly supportService = new DoctorSupportService();

  async createPayment(dto: CreatePaymentDto, currentDoctorId?: string) {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    await this.accessService.ensureOwnedPatient(dto.patientId, doctorId);

    const patient = await this.patientRepository.findOneBy({ id: dto.patientId });
    if (!patient) throw new Error('Patient not found');

    const totalAmount = dto.patientFee + dto.consultationFee;

    const payment = this.paymentRepository.create({
      patientId: dto.patientId,
      doctorId,
      patientFee: dto.patientFee.toString(),
      consultationFee: dto.consultationFee.toString(),
      amount: totalAmount.toString(),
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
    });

    await this.paymentRepository.save(payment);

    // If consultation fee was paid, update patient record
    if (dto.consultationFee > 0) {
      patient.hasPaidConsultation = true;
      await this.patientRepository.save(patient);
    }

    await this.supportService.logActivity({
      doctorId,
      patientId: dto.patientId,
      type: 'payment-received',
      message: `Payment of ${totalAmount} received via ${dto.paymentMethod.toUpperCase()}${dto.consultationFee > 0 ? ' (Includes Consultation Fee)' : ''}.`,
    });

    return payment;
  }

  async getPatientPayments(patientId: string, currentDoctorId?: string) {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    await this.accessService.ensureOwnedPatient(patientId, doctorId);

    return this.paymentRepository.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
  }
}
