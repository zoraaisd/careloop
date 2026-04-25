import { EntityManager } from 'typeorm';

import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import { Appointment, AppointmentStatus } from '../../../entities/appointment.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { DoctorAvailabilitySlot } from '../../../entities/doctor-availability-slot.entity';
import { Patient, PatientVerificationStatus } from '../../../entities/patient.entity';
import { DoctorApprovalStatus, User, UserRole } from '../../../entities/user.entity';
import { getWhatsappHealthcareService } from '../../whatsapp-healthcare/services/whatsapp-healthcare.service';
import type { CreatePublicAppointmentDto } from '../dto/create-public-appointment.dto';

type PublicDoctorRecord = {
  userId: string;
  name: string;
  specialization: string;
  experience: number;
  qualification: string;
  clinicName: string;
  clinicAddress: string;
  city: string;
  consultationFees: number;
  availableDays: string[];
  availableTimeSlots: string[];
  aboutDoctor: string | null;
  profileImageUrl: string | null;
};

type PublicDoctorAvailabilitySlot = {
  slotId: string;
  date: string;
  day: string;
  time: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENERATED_SLOT_PREFIX = 'generated:';

class PublicDoctorService {
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly slotRepository = AppDataSource.getRepository(DoctorAvailabilitySlot);

  async getApprovedDoctors(search?: string): Promise<PublicDoctorRecord[]> {
    const query = this.doctorProfileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('user.approval_status = :status', { status: DoctorApprovalStatus.APPROVED })
      .orderBy('user.createdAt', 'DESC');

    if (search?.trim()) {
      query.andWhere(
        '(LOWER(user.name) LIKE :search OR LOWER(profile.specialization) LIKE :search OR LOWER(profile.clinic_name) LIKE :search OR LOWER(profile.city) LIKE :search)',
        { search: `%${search.trim().toLowerCase()}%` },
      );
    }

    const profiles = await query.getMany();

    return profiles.map((profile) => this.serializeProfile(profile));
  }

  async getApprovedDoctorById(doctorId: string): Promise<PublicDoctorRecord> {
    const profile = await this.doctorProfileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('profile.user_id = :doctorId', { doctorId })
      .andWhere('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('user.approval_status = :status', { status: DoctorApprovalStatus.APPROVED })
      .getOne();

    if (!profile) {
      throw new AppError('Approved doctor not found', 404);
    }

    return this.serializeProfile(profile);
  }

  async getApprovedDoctorAvailability(
    doctorId: string,
    params?: { dateFrom?: string; dateTo?: string },
  ): Promise<PublicDoctorAvailabilitySlot[]> {
    const doctor = await this.ensureApprovedDoctor(doctorId);

    const dateFrom = params?.dateFrom ?? new Date().toISOString().slice(0, 10);
    const dateTo =
      params?.dateTo ??
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10);

    const slots = await this.slotRepository.find({
      where: { doctorId },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    const explicitSlots = slots
      .filter((slot) => !slot.isBooked && slot.date >= dateFrom && slot.date <= dateTo)
      .map((slot) => ({
        slotId: slot.id,
        date: slot.date,
        day: slot.day,
        time: slot.startTime,
      }));

    const generatedSlots = this.generateProfileSlots({
      doctor,
      dateFrom,
      dateTo,
      existingSlots: slots,
    });

    const combinedSlots = new Map<string, PublicDoctorAvailabilitySlot>();

    [...explicitSlots, ...generatedSlots].forEach((slot) => {
      combinedSlots.set(`${slot.date}__${slot.time}`, slot);
    });

    return Array.from(combinedSlots.values()).sort((left, right) =>
      left.date === right.date
        ? left.time.localeCompare(right.time)
        : left.date.localeCompare(right.date),
    );
  }

  async createPublicAppointment(
    doctorId: string,
    payload: CreatePublicAppointmentDto,
  ): Promise<{ message: string; appointmentId: string }> {
    const doctor = await this.ensureApprovedDoctor(doctorId);

    return AppDataSource.transaction(async (manager) => {
      const patients = manager.getRepository(Patient);
      const slots = manager.getRepository(DoctorAvailabilitySlot);
      const appointments = manager.getRepository(Appointment);

      const normalizedPhone = payload.patientPhone.replace(/\D/g, '');
      const slot =
        (await this.findRequestedSlot({
          manager,
          doctorId,
          requestedSlotId: payload.slotId,
        })) ?? null;

      if (!slot) {
        throw new AppError('Selected appointment slot was not found', 404);
      }

      if (slot.isBooked) {
        throw new AppError('Selected appointment slot is no longer available', 409);
      }

      const existingPatient = await patients.findOne({
        where: { phone: normalizedPhone },
      });

      if (existingPatient && existingPatient.primaryDoctorId && existingPatient.primaryDoctorId !== doctorId) {
        throw new AppError(
          'This phone number is already linked to another doctor record. Please use a different number.',
          409,
        );
      }

      const patient =
        existingPatient ??
        patients.create({
          name: payload.patientName.trim(),
          phone: normalizedPhone,
          age: payload.patientAge,
          email: payload.patientEmail?.trim() || null,
          gender: payload.patientGender?.trim() || null,
          bloodGroup: null,
          condition: null,
          notes: null,
          verificationStatus: PatientVerificationStatus.PENDING,
          whatsappVerified: false,
          isActive: true,
          lastVisitAt: null,
          primaryDoctorId: doctorId,
        });

      patient.name = payload.patientName.trim();
      patient.age = payload.patientAge;
      patient.email = payload.patientEmail?.trim() || null;
      patient.gender = payload.patientGender?.trim() || null;
      patient.primaryDoctorId = doctorId;
      patient.isActive = true;

      const savedPatient = await patients.save(patient);

      const duplicateAppointment = await appointments.findOne({
        where: {
          doctorId,
          appointmentDate: slot.date,
          appointmentTime: slot.startTime,
        },
      });

      if (duplicateAppointment) {
        throw new AppError('Selected appointment slot is no longer available', 409);
      }

      const appointment = appointments.create({
        patientId: savedPatient.id,
        doctorId,
        appointmentDate: slot.date,
        appointmentTime: slot.startTime,
        day: slot.day,
        appointmentType: 'consultation',
        notes: payload.notes?.trim() || null,
        status: AppointmentStatus.SCHEDULED,
        billingAmount: doctor.consultationFees.toFixed(2),
        cancelledAt: null,
      });

      const savedAppointment = await appointments.save(appointment);

      slot.isBooked = true;
      slot.appointmentId = savedAppointment.id;
      await slots.save(slot);

      getWhatsappHealthcareService()?.syncExternalAppointment({
        appointmentId: savedAppointment.id,
        patientId: savedPatient.id,
        patientName: savedPatient.name,
        patientPhone: savedPatient.phone,
        patientAge: savedPatient.age,
        patientGender: savedPatient.gender,
        patientEmail: savedPatient.email,
        doctorId,
        doctorName: doctor.name,
        specialization: doctor.specialization,
        consultationFee: doctor.consultationFees,
        slotId: slot.id,
        slotDay: slot.day,
        slotTime: slot.startTime,
        date: slot.date,
        notes: payload.notes?.trim() || null,
      });

      return {
        message: `Appointment booked with ${doctor.name} on ${slot.day} at ${slot.startTime}.`,
        appointmentId: savedAppointment.id,
      };
    });
  }

  private async ensureApprovedDoctor(doctorId: string): Promise<PublicDoctorRecord> {
    if (!UUID_PATTERN.test(doctorId)) {
      throw new AppError('Approved doctor not found', 404);
    }

    return this.getApprovedDoctorById(doctorId);
  }

  private serializeProfile(profile: DoctorProfile & { user: User }): PublicDoctorRecord {
    return {
      userId: profile.userId,
      name: profile.user.name,
      specialization: profile.specialization,
      experience: profile.experience,
      qualification: profile.qualification,
      clinicName: profile.clinicName,
      clinicAddress: profile.clinicAddress,
      city: profile.city,
      consultationFees: Number(profile.consultationFees),
      availableDays: profile.availableDays,
      availableTimeSlots: profile.availableTimeSlots,
      aboutDoctor: profile.aboutDoctor,
      profileImageUrl: profile.profileImageUrl,
    };
  }

  private generateProfileSlots(params: {
    doctor: PublicDoctorRecord;
    dateFrom: string;
    dateTo: string;
    existingSlots: DoctorAvailabilitySlot[];
  }): PublicDoctorAvailabilitySlot[] {
    const { doctor, dateFrom, dateTo, existingSlots } = params;
    const availableDays = new Set(
      doctor.availableDays.map((day) => day.trim().toLowerCase()).filter(Boolean),
    );
    const availableTimes = doctor.availableTimeSlots
      .map((time) => time.trim())
      .filter(Boolean);

    if (availableDays.size === 0 || availableTimes.length === 0) {
      return [];
    }

    const existingBookedOrCreatedKeys = new Set(
      existingSlots.map((slot) => `${slot.date}__${slot.startTime}`),
    );

    const generatedSlots: PublicDoctorAvailabilitySlot[] = [];
    let cursor = new Date(`${dateFrom}T00:00:00`);
    const endDate = new Date(`${dateTo}T00:00:00`);

    while (cursor <= endDate) {
      const date = cursor.toISOString().slice(0, 10);
      const day = cursor.toLocaleDateString('en-US', { weekday: 'long' });

      if (availableDays.has(day.toLowerCase())) {
        availableTimes.forEach((time) => {
          const key = `${date}__${time}`;
          if (!existingBookedOrCreatedKeys.has(key)) {
            generatedSlots.push({
              slotId: `${GENERATED_SLOT_PREFIX}${doctor.userId}:${date}:${time}`,
              date,
              day,
              time,
            });
          }
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return generatedSlots;
  }

  private async findRequestedSlot(params: {
    manager: EntityManager;
    doctorId: string;
    requestedSlotId: string;
  }): Promise<DoctorAvailabilitySlot | null> {
    const { manager, doctorId, requestedSlotId } = params;
    const slotRepository = manager.getRepository(DoctorAvailabilitySlot);

    if (requestedSlotId.startsWith(GENERATED_SLOT_PREFIX)) {
      const generatedSlot = this.parseGeneratedSlotId(requestedSlotId, doctorId);
      if (!generatedSlot) {
        return null;
      }

      const existingSlot = await slotRepository.findOne({
        where: {
          doctorId,
          date: generatedSlot.date,
          startTime: generatedSlot.time,
        },
      });

      if (existingSlot) {
        return existingSlot;
      }

      return slotRepository.create({
        doctorId,
        date: generatedSlot.date,
        day: generatedSlot.day,
        startTime: generatedSlot.time,
        isBooked: false,
        appointmentId: null,
      });
    }

    return slotRepository.findOne({
      where: { id: requestedSlotId, doctorId },
    });
  }

  private parseGeneratedSlotId(
    requestedSlotId: string,
    doctorId: string,
  ): { date: string; day: string; time: string } | null {
    const rawValue = requestedSlotId.slice(GENERATED_SLOT_PREFIX.length);
    const separatorIndex = rawValue.indexOf(':');

    if (separatorIndex === -1) {
      return null;
    }

    const encodedDoctorId = rawValue.slice(0, separatorIndex);
    const remainder = rawValue.slice(separatorIndex + 1);
    const lastSeparatorIndex = remainder.lastIndexOf(':');

    if (encodedDoctorId !== doctorId || lastSeparatorIndex === -1) {
      return null;
    }

    const date = remainder.slice(0, lastSeparatorIndex);
    const time = remainder.slice(lastSeparatorIndex + 1);

    if (!date || !time) {
      return null;
    }

    const day = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
    });

    return { date, day, time };
  }
}

export const publicDoctorService = new PublicDoctorService();
