import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
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
};

class DoctorService {
  private readonly doctorRepository = AppDataSource.getRepository(Doctor);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);

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
    };
  }
}

export const doctorService = new DoctorService();
