import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import {
  Appointment,
  AppointmentStatus,
} from '../../../entities/appointment.entity';
import { DoctorAvailabilitySlot } from '../../../entities/doctor-availability-slot.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { User, UserRole } from '../../../entities/user.entity';
import { In } from 'typeorm';
import type { CalendarResponse } from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import { addDays, formatDateOnly } from './doctor.utils';

export class CalendarService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);
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
    const currentProfile = await this.doctorProfileRepository.findOne({
      where: { userId: doctor.id },
      select: ['clinicId', 'clinicName', 'clinicAddress', 'city'],
    });

    const profileQuery = this.doctorProfileRepository
      .createQueryBuilder('profile')
      .select('profile.userId', 'userId');

    if (currentProfile?.clinicId) {
      profileQuery.where('profile.clinic_id = :clinicId', { clinicId: currentProfile.clinicId });
    } else if (currentProfile?.clinicName && currentProfile.clinicAddress && currentProfile.city) {
      profileQuery
        .where('profile.clinic_name = :clinicName', { clinicName: currentProfile.clinicName })
        .andWhere('profile.clinic_address = :clinicAddress', { clinicAddress: currentProfile.clinicAddress })
        .andWhere('profile.city = :city', { city: currentProfile.city });
    } else {
      profileQuery.where('profile.user_id = :doctorId', { doctorId: doctor.id });
    }

    const clinicProfiles = await profileQuery.getRawMany<{ userId: string }>();
    const clinicDoctorIds = clinicProfiles.map((profile) => profile.userId).filter(Boolean);
    const scopedDoctorIds = clinicDoctorIds.length > 0 ? clinicDoctorIds : [doctor.id];

    if (params.doctorId && !scopedDoctorIds.includes(params.doctorId)) {
      throw new AppError('Forbidden: selected doctor is outside this clinic', 403);
    }

    const activeDoctorIds = params.doctorId ? [params.doctorId] : scopedDoctorIds;

    const [doctors, slots, appointments] = await Promise.all([
      this.userRepository.find({
        where: { role: UserRole.DOCTOR, id: In(scopedDoctorIds) },
        order: { name: 'ASC' },
      }),
      this.slotRepository.find({
        where: { doctorId: In(activeDoctorIds) },
        relations: { doctor: true, appointment: { patient: true } },
        order: { date: 'ASC', startTime: 'ASC' },
      }),
      this.appointmentRepository.find({
        where: { doctorId: In(activeDoctorIds) },
        relations: { patient: true, doctor: true },
      }),
    ]);

    const filteredSlots = slots.filter(
      (slot) => slot.date >= dateFrom && slot.date <= dateTo,
    );
    const filteredAppointments = appointments.filter((appointment) => {
      const appointmentDate = formatDateOnly(appointment.appointmentDate);
      return appointmentDate >= dateFrom && appointmentDate <= dateTo;
    });
    const appointmentBySlotKey = new Map(
      filteredAppointments.map((appointment) => [
        `${appointment.doctorId}|${formatDateOnly(appointment.appointmentDate)}|${appointment.appointmentTime}`,
        appointment,
      ]),
    );
    const today = new Date().toISOString().slice(0, 10);
    const todaysAppointments = filteredAppointments.filter(
      (appointment) => formatDateOnly(appointment.appointmentDate) === today,
    );

    return {
      doctorId: params.doctorId ?? doctor.id,
      dateFrom,
      dateTo,
      doctors: doctors.map((doctor) => ({
        doctorId: doctor.id,
        doctorName: doctor.name,
        appointmentCount: filteredAppointments.filter(
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
          const appointment =
            slot.appointment ??
            filteredAppointments.find((item) => item.id === slot.appointmentId) ??
            appointmentBySlotKey.get(`${slot.doctorId}|${slot.date}|${slot.startTime}`);

          return {
            slotId: slot.id,
            doctorId: slot.doctorId,
            doctorName: slot.doctor.name,
            date: slot.date,
            day: slot.day,
            time: slot.startTime,
            isAvailable: false,
            patientId: appointment?.patientId,
            patientName: appointment?.patient?.name ?? 'Booked Visit',
            appointmentId: appointment?.id,
          };
        })
        .concat(
          filteredAppointments
            .filter(
              (appointment) =>
                !filteredSlots.some((slot) => slot.appointmentId === appointment.id),
            )
            .map((appointment) => ({
              slotId: `appointment-${appointment.id}`,
              doctorId: appointment.doctorId,
              doctorName: appointment.doctor.name,
              date: formatDateOnly(appointment.appointmentDate),
              day: appointment.day,
              time: appointment.appointmentTime,
              isAvailable: false,
              patientId: appointment.patientId,
              patientName: appointment.patient.name,
              appointmentId: appointment.id,
            })),
        ),
    };
  }
}
