import 'reflect-metadata';

import { portalAuthService } from '../src/common/services/portal-auth.service';
import { AppDataSource } from '../src/config/data-source';

async function main() {
  await AppDataSource.initialize();

  const result = await portalAuthService.login({
    email: 'dineshkrishnan487@gmail.com',
    password: 'doctor123',
  });

  console.log(
    JSON.stringify(
      {
        role: result.role,
        userId: result.userId,
        email: result.email,
        canAccessPortal: result.canAccessPortal,
        accessState: result.accessState,
      },
      null,
      2,
    ),
  );

  await AppDataSource.destroy();
}

main().catch(async (error) => {
  console.error(error);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
