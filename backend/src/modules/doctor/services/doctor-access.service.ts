import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
import { Appointment } from '../../../entities/appointment.entity';
import { Chat } from '../../../entities/chat.entity';
import { Patient } from '../../../entities/patient.entity';
import { Prescription } from '../../../entities/prescription.entity';
import { User, UserRole } from '../../../entities/user.entity';

export class DoctorAccessService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly appointmentRepository = AppDataSource.getRepository(Appointment);
  private readonly prescriptionRepository = AppDataSource.getRepository(Prescription);
  private readonly chatRepository = AppDataSource.getRepository(Chat);

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
