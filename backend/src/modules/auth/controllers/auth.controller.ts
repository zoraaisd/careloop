import type { Request, Response } from 'express';

import { validateRequest } from '../../../common/utils/validate-request';
import { LoginDto } from '../dto/login.dto';
import { SignupDto } from '../dto/signup.dto';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  static async signup(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(SignupDto, req.body);
    const result = await authService.signup(payload);

    res.status(201).json(result);
  }

  static async login(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(LoginDto, req.body);
    const result = await authService.login(payload);

    res.status(200).json(result);
  }
}
