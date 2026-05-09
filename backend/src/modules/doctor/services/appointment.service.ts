import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import {
  Appointment,
  AppointmentStatus,
} from '../../../entities/appointment.entity';
import { DoctorAvailabilitySlot } from '../../../entities/doctor-availability-slot.entity';
import { ChatMessageType, ChatSenderType } from '../../../entities/chat-message.entity';
import type { CreateAppointmentDto } from '../dto/create-appointment.dto';
import type { AppointmentListResponse } from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import { DoctorSupportService } from './doctor-support.service';
import {
  formatDateOnly,
  getDayFromDate,
  parseMoney,
} from './doctor.utils';

export class AppointmentService {
  private readonly appointmentRepository = AppDataSource.getRepository(Appointment);
  private readonly slotRepository = AppDataSource.getRepository(DoctorAvailabilitySlot);
  private readonly supportService = new DoctorSupportService();
  private readonly accessService = new DoctorAccessService();

  async listAppointments(currentDoctorId?: string, patientId?: string): Promise<AppointmentListResponse> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    
    const where: any = { doctorId };
    if (patientId) {
      where.patientId = patientId;
    }

    const appointments = await this.appointmentRepository.find({
      where,
      relations: { patient: true, doctor: true },
      order: { appointmentDate: 'DESC', appointmentTime: 'ASC' },
    });

    return {
      total: appointments.length,
      items: appointments.map((appointment) => ({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.name,
        day: appointment.day,
        date: formatDateOnly(appointment.appointmentDate),
        time: appointment.appointmentTime,
        notes: appointment.notes,
        status: appointment.status,
        createdAt: appointment.createdAt.toISOString(),
        billingAmount: parseMoney(appointment.billingAmount),
      })),
    };
  }

  async createAppointment(
    payload: CreateAppointmentDto,
    currentDoctorId?: string,
  ): Promise<{ message: string; appointmentId: string }> {
    const doctor = await this.accessService.ensureManagedDoctor(
      payload.doctorId,
      currentDoctorId,
    );
    const patient = await this.accessService.ensureOwnedPatient(
      payload.patientId,
      currentDoctorId,
    );

    const existingAppointment = await this.appointmentRepository.findOne({
      where: {
        doctorId: payload.doctorId,
        appointmentDate: payload.date,
        appointmentTime: payload.time,
        status: AppointmentStatus.SCHEDULED,
      },
    });

    if (existingAppointment) {
      throw new AppError('This appointment slot is already booked', 409);
    }

    const appointment = this.appointmentRepository.create({
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      appointmentDate: payload.date,
      appointmentTime: payload.time.trim(),
      day: payload.day?.trim() ?? getDayFromDate(payload.date),
      notes: payload.notes?.trim() ?? null,
      appointmentType: payload.appointmentType?.trim() ?? 'consultation',
      billingAmount: payload.billingAmount?.toFixed(2) ?? '0.00',
      status: AppointmentStatus.SCHEDULED,
    });

    const savedAppointment = await this.appointmentRepository.save(appointment);

    const existingSlot = await this.slotRepository.findOne({
      where: {
      doctorId: payload.doctorId,
      date: payload.date,
      startTime: payload.time.trim(),
        isBooked: true,
      },
    });

    if (existingSlot) {
      throw new AppError('This calendar slot is already marked as booked', 409);
    }

    const reusableSlot = await this.slotRepository.findOne({
      where: {
        doctorId: payload.doctorId,
        date: payload.date,
        startTime: payload.time.trim(),
        isBooked: false,
      },
    });

    if (reusableSlot) {
      reusableSlot.isBooked = true;
      reusableSlot.appointmentId = savedAppointment.id;
      await this.slotRepository.save(reusableSlot);
    } else {
      const slot = this.slotRepository.create({
        doctorId: payload.doctorId,
        date: payload.date,
        day: appointment.day,
        startTime: payload.time.trim(),
        isBooked: true,
        appointmentId: savedAppointment.id,
      });
      await this.slotRepository.save(slot);
    }

    const chat = await this.supportService.ensureChatForPatient(
      patient.id,
      doctor.id,
    );
    await this.supportService.appendChatMessage({
      chatId: chat.id,
      senderType: ChatSenderType.SYSTEM,
      messageType: ChatMessageType.SLOT,
      content: `Appointment confirmed with ${doctor.name} on ${appointment.day} at ${appointment.appointmentTime}.`,
      direction: 'outbound',
    });
    await this.supportService.logActivity({
      doctorId: doctor.id,
      patientId: patient.id,
      type: 'appointment-confirmed',
      message: `Appointment booked with ${doctor.name} on ${appointment.day} at ${appointment.appointmentTime}.`,
    });

    return {
      message: 'Appointment created successfully',
      appointmentId: savedAppointment.id,
    };
  }

  async cancelAppointment(
    appointmentId: string,
    currentDoctorId?: string,
  ): Promise<{ message: string }> {
    const appointment = await this.accessService.ensureOwnedAppointment(
      appointmentId,
      currentDoctorId,
    );

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancelledAt = new Date();
    await this.appointmentRepository.save(appointment);

    const slot = await this.slotRepository.findOne({
      where: { appointmentId: appointment.id },
    });

    if (slot) {
      slot.isBooked = false;
      slot.appointmentId = null;
      await this.slotRepository.save(slot);
    }

    await this.supportService.logActivity({
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      type: 'appointment-cancelled',
      message: `Appointment for ${appointment.patient.name} with ${appointment.doctor.name} was cancelled.`,
    });

    return { message: 'Appointment cancelled successfully' };
  }
}
