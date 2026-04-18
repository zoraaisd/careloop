import bcrypt from 'bcrypt';

import { logger } from '../../../common/logger';
import { AppDataSource } from '../../../config/data-source';
import { env } from '../../../config/env';
import { User, UserRole } from '../../../entities/user.entity';

const SALT_ROUNDS = 12;

export class BootstrapAdminService {
  private readonly userRepository = AppDataSource.getRepository(User);

  async ensureDefaultAdmin(): Promise<void> {
    if (!env.bootstrapAdminOnStart) {
      return;
    }

    const email = env.bootstrapAdminEmail.trim().toLowerCase();
    const existingAdmin = await this.userRepository.findOne({
      where: { email },
    });

    if (existingAdmin) {
      return;
    }

    const password = await bcrypt.hash(env.bootstrapAdminPassword, SALT_ROUNDS);

    const admin = this.userRepository.create({
      name: env.bootstrapAdminName.trim(),
      email,
      phone: env.bootstrapAdminPhone.trim(),
      password,
      role: UserRole.ADMIN,
    });

    await this.userRepository.save(admin);

    logger.warn(
      {
        email,
      },
      'Default admin user was bootstrapped. Change these credentials before production use.',
    );
  }
}
