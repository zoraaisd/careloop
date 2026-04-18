import type { JwtPayload } from 'jsonwebtoken';

import type { UserRole } from '../../../entities/user.entity';

export interface AuthResponse {
  token: string;
  role: UserRole;
  userId: string;
}

export interface AuthenticatedUser extends JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
}
