const fs = require('fs');
const file = 'c:/Users/DELL/Desktop/meditracker/meditracker/backend/src/modules/auth/services/public-doctor.service.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import type { CreatePublicDoctorReviewDto } from '../dto/create-public-doctor-review.dto';",
  "import type { CreatePublicDoctorReviewDto } from '../dto/create-public-doctor-review.dto';\nimport { Doctor } from '../../../entities/doctor.entity';"
);

content = content.replace(
  "private readonly reviewRepository = AppDataSource.getRepository(DoctorReview);",
  "private readonly reviewRepository = AppDataSource.getRepository(DoctorReview);\n  private readonly legacyDoctorRepository = AppDataSource.getRepository(Doctor);"
);

content = content.replace(
  `private async getPatientCount(doctorId: string): Promise<number> {
    const raw = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .select('COUNT(DISTINCT appointment.patient_id)', 'patientCount')
      .where('appointment.doctor_id = :doctorId', { doctorId })
      .andWhere('appointment.status != :cancelledStatus', { cancelledStatus: AppointmentStatus.CANCELLED })
      .getRawOne<{ patientCount: string }>();

    return Number(raw?.patientCount ?? 0);
  }`,
  `private async getPatientCount(doctorId: string): Promise<number> {
    const raw = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .select('COUNT(DISTINCT appointment.patient_id)', 'patientCount')
      .where('appointment.doctor_id = :doctorId', { doctorId })
      .andWhere('appointment.status != :cancelledStatus', { cancelledStatus: AppointmentStatus.CANCELLED })
      .getRawOne<{ patientCount: string }>();

    const dynamicCount = Number(raw?.patientCount ?? 0);
    const legacyDoctor = await this.legacyDoctorRepository.findOne({ where: { sourceUserId: doctorId } });
    const legacyCount = legacyDoctor?.patientCount ?? 0;

    return dynamicCount + legacyCount;
  }`
);

content = content.replace(
  `private async getPatientCountMap(doctorIds: string[]): Promise<Map<string, number>> {
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
  }`,
  `private async getPatientCountMap(doctorIds: string[]): Promise<Map<string, number>> {
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

    const legacyDoctors = await this.legacyDoctorRepository
      .createQueryBuilder('doctor')
      .select('doctor.source_user_id', 'doctorId')
      .addSelect('doctor.patient_count', 'legacyPatientCount')
      .where('doctor.source_user_id IN (:...doctorIds)', { doctorIds })
      .getRawMany<{ doctorId: string; legacyPatientCount: string }>();

    const legacyMap = new Map<string, number>();
    legacyDoctors.forEach((row) => {
      legacyMap.set(row.doctorId, Number(row.legacyPatientCount ?? 0));
    });

    const map = new Map<string, number>();
    doctorIds.forEach((id) => {
       const dynamicCount = Number(rows.find(r => r.doctorId === id)?.patientCount ?? 0);
       const legacyCount = legacyMap.get(id) ?? 0;
       map.set(id, dynamicCount + legacyCount);
    });

    return map;
  }`
);

fs.writeFileSync(file, content);
console.log('patched successfully');
