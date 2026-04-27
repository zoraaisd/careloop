import type { Request, Response } from 'express';

import { validateRequest } from '../../../common/utils/validate-request';
import { LoginDto } from '../dto/login.dto';
import { RequestSignupOtpDto, VerifySignupOtpDto } from '../dto/signup-otp.dto';
import { SignupDto } from '../dto/signup.dto';
import { AuthService } from '../services/auth.service';
import { signupOtpService } from '../services/signup-otp.service';

const authService = new AuthService();

export class AuthController {
  static async requestSignupOtp(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(RequestSignupOtpDto, req.body);
    const result = await signupOtpService.requestOtp(payload);

    res.status(200).json({
      message: `OTP sent to mail id ${payload.email.trim().toLowerCase()}`,
      otp: result.otp,
      expiresInSeconds: result.expiresInSeconds,
    });
  }

  static async verifySignupOtp(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(VerifySignupOtpDto, req.body);
    const result = signupOtpService.verifyOtp(payload);

    res.status(200).json(result);
  }

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
