import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
import { Appointment, AppointmentStatus } from '../../../entities/appointment.entity';
import { Doctor } from '../../../entities/doctor.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { DoctorApprovalStatus, User, UserRole } from '../../../entities/user.entity';

type DoctorResponse = {
  id: number;
  sourceUserId: string | null;
  name: string;
  email: string;
  specialization: string;
  experience: number;
  clinicName: string;
  fees: number;
  about: string | null;
  patientCount: number;
};

class DoctorService {
  private readonly doctorRepository = AppDataSource.getRepository(Doctor);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly appointmentRepository = AppDataSource.getRepository(Appointment);

  async getDoctors(): Promise<DoctorResponse[]> {
    await this.syncDoctorsFromProfiles();

    const doctors = await this.doctorRepository.find({
      order: { id: 'ASC' },
    });

    return doctors.map((doctor) => this.serializeDoctor(doctor));
  }

  async getDoctorById(id: number): Promise<DoctorResponse> {
    await this.syncDoctorsFromProfiles();

    const doctor = await this.doctorRepository.findOne({
      where: { id },
    });

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    return this.serializeDoctor(doctor);
  }

  private async syncDoctorsFromProfiles(): Promise<void> {
    const profiles = await this.doctorProfileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('user.approval_status = :status', { status: DoctorApprovalStatus.APPROVED })
      .orderBy('profile.createdAt', 'ASC')
      .getMany();

    if (profiles.length === 0) {
      return;
    }

    const doctors = await this.doctorRepository.find();
    const doctorsBySourceUserId = new Map(
      doctors
        .filter((doctor) => doctor.sourceUserId)
        .map((doctor) => [doctor.sourceUserId as string, doctor]),
    );
    const patientCountByDoctorId = await this.getPatientCountMap(profiles.map((profile) => profile.userId));

    const recordsToSave = profiles.map((profile) => {
      const existingDoctor = doctorsBySourceUserId.get(profile.userId) ?? this.doctorRepository.create();

      existingDoctor.name = profile.user.name;
      existingDoctor.email = profile.user.email;
      existingDoctor.specialization = profile.specialization;
      existingDoctor.experience = profile.experience;
      existingDoctor.clinicName = profile.clinicName;
      existingDoctor.fees = profile.consultationFees;
      existingDoctor.about = profile.aboutDoctor;
      existingDoctor.sourceUserId = profile.userId;
      existingDoctor.patientCount = patientCountByDoctorId.get(profile.userId) ?? 0;

      return existingDoctor;
    });

    if (recordsToSave.length > 0) {
      await this.doctorRepository.save(recordsToSave);
    }
  }

  private serializeDoctor(doctor: Doctor): DoctorResponse {
    return {
      id: doctor.id,
      sourceUserId: doctor.sourceUserId,
      name: doctor.name,
      email: doctor.email,
      specialization: doctor.specialization,
      experience: doctor.experience,
      clinicName: doctor.clinicName,
      fees: Number(doctor.fees),
      about: doctor.about,
      patientCount: doctor.patientCount ?? 0,
    };
  }

  private async getPatientCountMap(doctorIds: string[]): Promise<Map<string, number>> {
    if (doctorIds.length === 0) {
      return new Map();
    }

    const rows = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .select('appointment.doctor_id', 'doctorId')
      .addSelect('COUNT(DISTINCT appointment.patient_id)', 'patientCount')
      .where('appointment.doctor_id IN (:...doctorIds)', { doctorIds })
      .andWhere('appointment.status != :cancelledStatus', { cancelledStatus: AppointmentStatus.CANCELLED })
      .groupBy('appointment.doctor_id')
      .getRawMany<{ doctorId: string; patientCount: string }>();

    const map = new Map<string, number>();
    rows.forEach((row) => {
      map.set(row.doctorId, Number(row.patientCount ?? 0));
    });

    return map;
  }
}

export const doctorService = new DoctorService();
