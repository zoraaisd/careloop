import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { AppError } from '../../../common/errors/app-error';
import { env } from '../../../config/env';
import { AppDataSource } from '../../../config/data-source';
import { User } from '../../../entities/user.entity';
import type { LoginDto } from '../dto/login.dto';
import type { SignupDto } from '../dto/signup.dto';
import type { AuthResponse } from '../types/auth.types';

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = env.jwtExpiresIn as SignOptions['expiresIn'];

export class AuthService {
  private readonly userRepository = AppDataSource.getRepository(User);

  async signup(payload: SignupDto): Promise<AuthResponse> {
    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    if (payload.password !== payload.confirmPassword) {
      throw new AppError('Passwords do not match', 400);
    }

    const password = await bcrypt.hash(payload.password, SALT_ROUNDS);

    const user = this.userRepository.create({
      name: payload.name.trim(),
      email,
      phone: payload.phone.trim(),
      password,
      role: payload.role,
    });

    const savedUser = await this.userRepository.save(user);

    return this.createAuthResponse(savedUser);
  }

  async login(payload: LoginDto): Promise<AuthResponse> {
    const email = payload.email.trim().toLowerCase();
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.password);

    if (!passwordMatches) {
      throw new AppError('Invalid email or password', 401);
    }

    return this.createAuthResponse(user);
  }

  private createAuthResponse(user: User): AuthResponse {
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email,
      },
      env.jwtSecret,
      { expiresIn: JWT_EXPIRES_IN },
    );

    return {
      token,
      role: user.role,
      userId: user.id,
    };
  }
}
