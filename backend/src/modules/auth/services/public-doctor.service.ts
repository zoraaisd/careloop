import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import { Appointment, AppointmentStatus } from '../../../entities/appointment.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { DoctorAvailabilitySlot } from '../../../entities/doctor-availability-slot.entity';
import { Patient, PatientVerificationStatus } from '../../../entities/patient.entity';
import { DoctorApprovalStatus, User, UserRole } from '../../../entities/user.entity';
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
    await this.ensureApprovedDoctor(doctorId);

    const dateFrom = params?.dateFrom ?? new Date().toISOString().slice(0, 10);
    const dateTo =
      params?.dateTo ??
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10);

    const slots = await this.slotRepository.find({
      where: { doctorId },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    return slots
      .filter((slot) => !slot.isBooked && slot.date >= dateFrom && slot.date <= dateTo)
      .map((slot) => ({
        slotId: slot.id,
        date: slot.date,
        day: slot.day,
        time: slot.startTime,
      }));
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
      const slot = await slots.findOne({
        where: { id: payload.slotId, doctorId },
      });

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

      return {
        message: `Appointment booked with ${doctor.name} on ${slot.day} at ${slot.startTime}.`,
        appointmentId: savedAppointment.id,
      };
    });
  }

  private async ensureApprovedDoctor(doctorId: string): Promise<PublicDoctorRecord> {
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
}

export const publicDoctorService = new PublicDoctorService();
