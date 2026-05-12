import { AppDataSource } from './src/config/data-source';

async function check() {
  try {
    await AppDataSource.initialize();
    const user = await AppDataSource.query("SELECT email FROM users WHERE id = 'e5012cce-bcb5-4001-a7ac-01c8b064b49c'");
    console.log('User Email:', user);
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

check();
