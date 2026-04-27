import { AppDataSource } from './src/config/data-source';
import { DoctorProfile } from './src/entities/doctor-profile.entity';

async function checkProfiles() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(DoctorProfile);
  const profiles = await repo.find();
  console.log('Profiles in DB:', profiles.map(p => ({ id: p.id, clinic: p.clinicName })));
  await AppDataSource.destroy();
}

checkProfiles().catch(console.error);
