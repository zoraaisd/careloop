import { AppDataSource } from './src/config/data-source';

async function check() {
  try {
    await AppDataSource.initialize();
    const tickets = await AppDataSource.query("SELECT id, clinic_name, clinic_email, doctor_id FROM support_tickets ORDER BY created_at DESC LIMIT 5");
    console.log('Recent Tickets:', JSON.stringify(tickets, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

check();
