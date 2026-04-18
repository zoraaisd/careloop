import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import {
  Appointment,
  AppointmentStatus,
} from '../../../entities/appointment.entity';
import { DoctorAvailabilitySlot } from '../../../entities/doctor-availability-slot.entity';
import { User, UserRole } from '../../../entities/user.entity';
import type { CalendarResponse } from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import { addDays, formatDateOnly } from './doctor.utils';

export class CalendarService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly slotRepository = AppDataSource.getRepository(DoctorAvailabilitySlot);
  private readonly appointmentRepository = AppDataSource.getRepository(Appointment);
  private readonly accessService = new DoctorAccessService();

  async getCalendar(params: {
    doctorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }, currentDoctorId?: string): Promise<CalendarResponse> {
    const doctor = await this.accessService.ensureCurrentDoctor(currentDoctorId);
    const dateFrom = params.dateFrom ?? new Date().toISOString().slice(0, 10);
    const dateTo = params.dateTo ?? addDays(dateFrom, 5);
    const scopedDoctorId = params.doctorId ?? doctor.id;

    if (scopedDoctorId !== doctor.id) {
      throw new AppError('Forbidden: you can only view your own calendar', 403);
    }

    const [doctors, slots, appointments] = await Promise.all([
      this.userRepository.find({
        where: { role: UserRole.DOCTOR, id: doctor.id },
        order: { name: 'ASC' },
      }),
      this.slotRepository.find({
        where: { doctorId: scopedDoctorId },
        relations: { doctor: true, appointment: true },
        order: { date: 'ASC', startTime: 'ASC' },
      }),
      this.appointmentRepository.find({
        where: { doctorId: scopedDoctorId },
        relations: { patient: true, doctor: true },
      }),
    ]);

    const filteredSlots = slots.filter(
      (slot) => slot.date >= dateFrom && slot.date <= dateTo,
    );
    const today = new Date().toISOString().slice(0, 10);
    const todaysAppointments = appointments.filter(
      (appointment) => formatDateOnly(appointment.appointmentDate) === today,
    );

    return {
      doctorId: scopedDoctorId,
      dateFrom,
      dateTo,
      doctors: doctors.map((doctor) => ({
        doctorId: doctor.id,
        doctorName: doctor.name,
        appointmentCount: appointments.filter(
          (appointment) => appointment.doctorId === doctor.id,
        ).length,
      })),
      summary: {
        today: todaysAppointments.length,
        waiting: todaysAppointments.filter(
          (appointment) => appointment.status === AppointmentStatus.WAITING,
        ).length,
        engaged: todaysAppointments.filter(
          (appointment) => appointment.status === AppointmentStatus.ENGAGED,
        ).length,
        done: todaysAppointments.filter(
          (appointment) => appointment.status === AppointmentStatus.DONE,
        ).length,
      },
      availableSlots: filteredSlots
        .filter((slot) => !slot.isBooked)
        .map((slot) => ({
          slotId: slot.id,
          doctorId: slot.doctorId,
          doctorName: slot.doctor.name,
          date: slot.date,
          day: slot.day,
          time: slot.startTime,
          isAvailable: true,
        })),
      bookedSlots: filteredSlots
        .filter((slot) => slot.isBooked)
        .map((slot) => {
          const appointment = appointments.find(
            (item) => item.id === slot.appointmentId,
          );

          return {
            slotId: slot.id,
            doctorId: slot.doctorId,
            doctorName: slot.doctor.name,
            date: slot.date,
            day: slot.day,
            time: slot.startTime,
            isAvailable: false,
            patientId: appointment?.patientId,
            patientName: appointment?.patient.name,
            appointmentId: appointment?.id,
          };
        }),
    };
  }
}
