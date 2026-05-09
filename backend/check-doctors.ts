import 'reflect-metadata';
import { AppDataSource } from './src/config/data-source';
import { User, UserRole } from './src/entities/user.entity';

async function check() {
  try {
    const ds = await AppDataSource.initialize();
    const repo = ds.getRepository(User);
    const doctors = await repo.find({ where: { role: UserRole.DOCTOR } });
    console.log('--- Doctor Status Report ---');
    console.log('Found', doctors.length, 'doctors');
    for (const d of doctors) {
      console.log(` + Name: ${d.name} | Email: ${d.email} | Status: ${d.approvalStatus} | Sub: ${d.subscriptionStatus}`);
    }
    await ds.destroy();
  } catch (e) {
    console.error('Error:', e);
  }
}
check();
