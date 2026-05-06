import emailjs from '@emailjs/browser';

import { apiClient } from '@/services/api';

export type SignupRole = 'patient' | 'doctor';

export type RequestSignupOtpPayload = {
  name: string;
  email: string;
  phone: string;
  role: SignupRole;
};

const emailJsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID ?? '';
const emailJsTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? '';
const emailJsWelcomeTemplateId = import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE_ID ?? '';
const emailJsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '';

export type VerifySignupOtpPayload = {
  email: string;
  phone: string;
  role: SignupRole;
  otp: string;
};

export const requestSignupOtp = async (
  payload: RequestSignupOtpPayload,
): Promise<{ message: string; expiresInSeconds: number }> => {
  const { data } = await apiClient.post<{ message: string; expiresInSeconds: number; emailDelivered?: boolean; emailDeliveryError?: string }>(
    '/auth/signup/request-otp-email',
    payload,
  );

  if (data.emailDelivered === false) {
    throw new Error(`Unable to send OTP email: ${data.emailDeliveryError || 'Temporary server error'}`);
  }

  return {
    message: data.message,
    expiresInSeconds: data.expiresInSeconds,
  };
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


