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
import { Patient } from '../../../entities/patient.entity';
import { User, UserRole } from '../../../entities/user.entity';

export class AppointmentService {
  private static readonly BUFFER_MINUTES = 10;
  private readonly appointmentRepository = AppDataSource.getRepository(Appointment);
  private readonly slotRepository = AppDataSource.getRepository(DoctorAvailabilitySlot);
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly supportService = new DoctorSupportService();
  private readonly accessService = new DoctorAccessService();

  private isSlotBlockingStatus(status: AppointmentStatus): boolean {
    return status !== AppointmentStatus.CANCELLED;
  }

  private toMinutes(time: string): number | null {
    const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;

    const [, rawHour, rawMinute, rawPeriod] = match;
    let hour = Number(rawHour);
    const minute = Number(rawMinute);
    const period = rawPeriod.toUpperCase();

    if (period === 'AM') {
      hour = hour === 12 ? 0 : hour;
    } else {
      hour = hour === 12 ? 12 : hour + 12;
    }

    return hour * 60 + minute;
  }

  private formatConflictMessage(conflict: Appointment): string {
    return `${conflict.appointmentTime} already booked for ${conflict.patient.name}.`;
  }

  private formatBufferMessage(requestedTime: string, conflict: Appointment): string {
    return `${requestedTime} unavailable. Buffer time protected around ${conflict.patient.name}'s ${conflict.appointmentTime} appointment.`;
  }

  private async findConflictingAppointment(
    doctorId: string,
    date: string,
    time: string,
    excludedAppointmentId?: string,
  ): Promise<{ appointment: Appointment; exact: boolean } | null> {
    const requestedMinutes = this.toMinutes(time);
    if (requestedMinutes === null) {
      return null;
    }

    const appointments = await this.appointmentRepository.find({
      where: {
        doctorId,
        appointmentDate: date,
      },
      relations: { patient: true },
    });

    for (const appointment of appointments) {
      if (appointment.id === excludedAppointmentId) {
        continue;
      }

      if (appointment.status === AppointmentStatus.CANCELLED) {
        continue;
      }

      const appointmentMinutes = this.toMinutes(appointment.appointmentTime);
      if (appointmentMinutes === null) {
        continue;
      }

      const diff = Math.abs(appointmentMinutes - requestedMinutes);
      if (diff === 0) {
        return { appointment, exact: true };
      }

      if (diff < AppointmentService.BUFFER_MINUTES) {
        return { appointment, exact: false };
      }
    }

    return null;
  }

  private async getClinicDoctorIds(currentDoctorId?: string): Promise<string[]> {
    return this.accessService.getClinicDoctorIds(currentDoctorId);
  }

  private async releaseAppointmentSlot(appointmentId: string): Promise<void> {
    const slot = await this.slotRepository.findOne({
      where: { appointmentId },
    });

    if (!slot) {
      return;
    }

    slot.isBooked = false;
    slot.appointmentId = null;
    await this.slotRepository.save(slot);
  }

  private async assignAppointmentSlot(appointment: Appointment): Promise<void> {
    const existingSlot = await this.slotRepository.findOne({
      where: {
        doctorId: appointment.doctorId,
        date: appointment.appointmentDate,
        startTime: appointment.appointmentTime,
        isBooked: true,
      },
    });

    if (existingSlot && existingSlot.appointmentId !== appointment.id) {
      throw new AppError('This calendar slot is already marked as booked', 409);
    }

    if (existingSlot) {
      existingSlot.appointmentId = appointment.id;
      await this.slotRepository.save(existingSlot);
      return;
    }

    const reusableSlot = await this.slotRepository.findOne({
      where: {
        doctorId: appointment.doctorId,
        date: appointment.appointmentDate,
        startTime: appointment.appointmentTime,
        isBooked: false,
      },
    });

    if (reusableSlot) {
      reusableSlot.isBooked = true;
      reusableSlot.appointmentId = appointment.id;
      await this.slotRepository.save(reusableSlot);
      return;
    }

    const slot = this.slotRepository.create({
      doctorId: appointment.doctorId,
      date: appointment.appointmentDate,
      day: appointment.day,
      startTime: appointment.appointmentTime,
      isBooked: true,
      appointmentId: appointment.id,
    });
    await this.slotRepository.save(slot);
  }

  async listAppointments(currentDoctorId?: string, patientId?: string): Promise<AppointmentListResponse> {
    const doctorIds = await this.getClinicDoctorIds(currentDoctorId);

    const query = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .where('appointment.doctor_id IN (:...doctorIds)', { doctorIds });

    if (patientId) {
      query.andWhere('appointment.patient_id = :patientId', { patientId });
    }

    const appointments = await query
      .orderBy('appointment.appointmentDate', 'DESC')
      .addOrderBy('appointment.appointmentTime', 'ASC')
      .getMany();

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
    const clinicDoctorIds = await this.getClinicDoctorIds(currentDoctorId);

    if (!clinicDoctorIds.includes(payload.doctorId)) {
      throw new AppError('Selected doctor must belong to the same clinic', 400);
    }

    const [doctor, patient] = await Promise.all([
      this.userRepository.findOne({
        where: { id: payload.doctorId, role: UserRole.DOCTOR },
      }),
      this.patientRepository.findOne({
        where: { id: payload.patientId, isActive: true },
      }),
    ]);

    if (!doctor) {
      throw new AppError('Selected doctor not found', 404);
    }

    if (!patient || !patient.primaryDoctorId || !clinicDoctorIds.includes(patient.primaryDoctorId)) {
      throw new AppError('Selected patient not found in this clinic', 404);
    }

    const conflictingAppointment = await this.findConflictingAppointment(
      payload.doctorId,
      payload.date,
      payload.time,
    );

    if (conflictingAppointment) {
      throw new AppError(
        conflictingAppointment.exact
          ? this.formatConflictMessage(conflictingAppointment.appointment)
          : this.formatBufferMessage(payload.time, conflictingAppointment.appointment),
        409,
      );
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

    await this.assignAppointmentSlot(savedAppointment);

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

  async updateAppointment(
    appointmentId: string,
    payload: CreateAppointmentDto,
    currentDoctorId?: string,
  ): Promise<{ message: string; appointmentId: string }> {
    const clinicDoctorIds = await this.getClinicDoctorIds(currentDoctorId);
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
      relations: { patient: true, doctor: true },
    });

    if (!appointment || !clinicDoctorIds.includes(appointment.doctorId)) {
      throw new AppError('Appointment not found or not assigned to this clinic', 404);
    }

    if (!clinicDoctorIds.includes(payload.doctorId)) {
      throw new AppError('Selected doctor must belong to the same clinic', 400);
    }

    const [doctor, patient] = await Promise.all([
      this.userRepository.findOne({
        where: { id: payload.doctorId, role: UserRole.DOCTOR },
      }),
      this.patientRepository.findOne({
        where: { id: payload.patientId, isActive: true },
      }),
    ]);

    if (!doctor) {
      throw new AppError('Selected doctor not found', 404);
    }

    if (!patient || !patient.primaryDoctorId || !clinicDoctorIds.includes(patient.primaryDoctorId)) {
      throw new AppError('Selected patient not found in this clinic', 404);
    }

    const conflictingAppointment = await this.findConflictingAppointment(
      payload.doctorId,
      payload.date,
      payload.time,
      appointment.id,
    );

    if (conflictingAppointment) {
      throw new AppError(
        conflictingAppointment.exact
          ? this.formatConflictMessage(conflictingAppointment.appointment)
          : this.formatBufferMessage(payload.time, conflictingAppointment.appointment),
        409,
      );
    }

    const nextStatus = payload.status ?? appointment.status;
    const slotChanged =
      appointment.doctorId !== payload.doctorId ||
      appointment.appointmentDate !== payload.date ||
      appointment.appointmentTime !== payload.time.trim();
    const shouldReleaseSlot =
      slotChanged || !this.isSlotBlockingStatus(nextStatus);
    const shouldAssignSlot = this.isSlotBlockingStatus(nextStatus);

    if (shouldReleaseSlot) {
      await this.releaseAppointmentSlot(appointment.id);
    }

    appointment.patientId = payload.patientId;
    appointment.doctorId = payload.doctorId;
    appointment.appointmentDate = payload.date;
    appointment.appointmentTime = payload.time.trim();
    appointment.day = payload.day?.trim() ?? getDayFromDate(payload.date);
    appointment.notes = payload.notes?.trim() ?? null;
    appointment.appointmentType = payload.appointmentType?.trim() ?? appointment.appointmentType;
    appointment.billingAmount = payload.billingAmount?.toFixed(2) ?? appointment.billingAmount;
    appointment.status = nextStatus;
    appointment.cancelledAt = nextStatus === AppointmentStatus.CANCELLED ? new Date() : null;

    const savedAppointment = await this.appointmentRepository.save(appointment);

    if (shouldAssignSlot) {
      await this.assignAppointmentSlot(savedAppointment);
    }

    return {
      message: 'Appointment updated successfully',
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

    await this.releaseAppointmentSlot(appointment.id);

    await this.supportService.logActivity({
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      type: 'appointment-cancelled',
      message: `Appointment for ${appointment.patient.name} with ${appointment.doctor.name} was cancelled.`,
    });

    return { message: 'Appointment cancelled successfully' };
  }
}
