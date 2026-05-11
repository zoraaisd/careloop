import 'reflect-metadata';

import { AppDataSource } from '../src/config/data-source';
import { AdminClinicRecord } from '../src/entities/admin-clinic-record.entity';
import { DoctorProfile } from '../src/entities/doctor-profile.entity';
import { UserRole } from '../src/entities/user.entity';

async function main() {
  await AppDataSource.initialize();

  const profileRepository = AppDataSource.getRepository(DoctorProfile);
  const manualClinicRepository = AppDataSource.getRepository(AdminClinicRecord);

  const profiles = await profileRepository.find({ relations: { user: true } });
  const doctorProfiles = profiles.filter((profile) => profile.user?.role === UserRole.DOCTOR);

  console.log('DOCTOR_PROFILES');
  for (const profile of doctorProfiles) {
    console.log(
      JSON.stringify({
        userId: profile.userId,
        clinicId: profile.clinicId,
        clinicName: profile.clinicName,
        ownerName: profile.user.name,
        email: profile.user.email,
      }),
    );
  }

  const manualClinics = await manualClinicRepository.find();
  console.log('MANUAL_CLINICS');
  for (const clinic of manualClinics) {
    console.log(
      JSON.stringify({
        id: clinic.id,
        clinicName: clinic.clinicName,
        ownerName: clinic.ownerName,
        email: clinic.email,
      }),
    );
  }

  await AppDataSource.destroy();
}

main().catch(async (error) => {
  console.error(error);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
