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
  const { data } = await apiClient.post<{ message: string; expiresInSeconds: number; otp: string }>(
    '/auth/signup/request-otp',
    payload,
  );

  if (!emailJsServiceId || !emailJsTemplateId || !emailJsPublicKey) {
    throw new Error('EmailJS frontend configuration is missing.');
  }

  try {
    await emailjs.send(
      emailJsServiceId,
      emailJsTemplateId,
      {
        otp: data.otp,
        passcode: data.otp,
        code: data.otp,
        verification_code: data.otp,
        name: payload.name,
        to_name: payload.name,
        from_name: 'Care Loop',
        user_name: payload.name,
        email: payload.email,
        to_email: payload.email,
        from_email: payload.email,
        user_email: payload.email,
        reply_to: payload.email,
        phone: payload.phone,
        role: payload.role,
        app_name: 'Care Loop',
        expiry_minutes: String(Math.max(1, Math.floor(data.expiresInSeconds / 60))),
        message: `Your Care Loop OTP is ${data.otp}. It expires soon.`,
        subject: `Your Care Loop OTP is ${data.otp}`,
      },
      emailJsPublicKey,
    );
  } catch (error) {
    const emailJsError = error as { text?: string; status?: number };
    const details = emailJsError.text || `EmailJS request failed${emailJsError.status ? ` (${emailJsError.status})` : ''}.`;
    throw new Error(`Unable to send OTP email: ${details}`);
  }

  return {
    message: `OTP sent to ${payload.email}`,
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

export const sendSignupVerifiedWelcomeEmail = async (payload: {
  name: string;
  email: string;
  role: SignupRole;
}): Promise<void> => {
  if (!emailJsServiceId || !emailJsWelcomeTemplateId || !emailJsPublicKey) {
    throw new Error('EmailJS welcome template configuration is missing.');
  }

  try {
    await emailjs.send(
      emailJsServiceId,
      emailJsWelcomeTemplateId,
      {
        name: payload.name,
        to_name: payload.name,
        user_name: payload.name,
        email: payload.email,
        to_email: payload.email,
        user_email: payload.email,
        role: payload.role,
        app_name: 'Care Loop',
        subject: 'Welcome to Care Loop',
        message:
          payload.role === 'doctor'
            ? 'Your OTP is verified. Welcome to Care Loop. You can now complete your doctor onboarding.'
            : 'Your OTP is verified. Welcome to Care Loop. Your account is now ready.',
      },
      emailJsPublicKey,
    );
  } catch (error) {
    const emailJsError = error as { text?: string; status?: number };
    const details = emailJsError.text || `EmailJS request failed${emailJsError.status ? ` (${emailJsError.status})` : ''}.`;
    throw new Error(`Unable to send welcome email: ${details}`);
  }
};
