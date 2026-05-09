import axios from 'axios';

import { apiClient } from '@/services/api';

export type SignupRole = 'patient' | 'doctor';

export type RequestSignupOtpPayload = {
  name: string;
  email: string;
  phone: string;
  role: SignupRole;
};

export type VerifySignupOtpPayload = {
  email: string;
  phone: string;
  role: SignupRole;
  otp: string;
};

export const requestSignupOtp = async (
  payload: RequestSignupOtpPayload,
): Promise<{
  message: string;
  expiresInSeconds: number;
  otp?: string;
  emailDelivered?: boolean;
}> => {
  try {
    const { data } = await apiClient.post<{
      message: string;
      expiresInSeconds: number;
      otp?: string;
      emailDelivered?: boolean;
      emailDeliveryError?: string;
    }>(
      '/auth/signup/request-otp-email',
      payload,
    );

    return {
      message: data.message,
      expiresInSeconds: data.expiresInSeconds,
      otp: data.otp,
      emailDelivered: data.emailDelivered,
    };
  } catch (error) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      throw new Error(error.response?.data?.message ?? 'Unable to send OTP right now.');
    }

    throw error;
  }
};

export const verifySignupOtp = async (
  payload: VerifySignupOtpPayload,
): Promise<{ message: string; signupVerificationToken: string }> => {
  const { data } = await apiClient.post<{ message: string; signupVerificationToken: string }>(
    '/auth/signup/verify-otp',
    payload,
  );

  return data;
};


