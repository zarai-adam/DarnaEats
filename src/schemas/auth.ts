import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().trim().email('validation.email'),
  password: z.string().min(1, 'validation.required'),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(2, 'validation.required').max(80, 'validation.tooLong'),
    email: z.string().trim().email('validation.email'),
    password: z.string().min(8, 'validation.passwordMin').max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'validation.passwordMatch' });
export type SignUpValues = z.infer<typeof signUpSchema>;

/** Tunisian mobile numbers: 8 digits starting with 2, 4, 5 or 9. */
export const tunisianPhoneSchema = z
  .string()
  .trim()
  .regex(/^[2459]\d{7}$/, 'validation.phone');

export function toE164Tunisia(localNumber: string): string {
  return `+216${localNumber.replace(/\D/g, '')}`;
}

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'validation.otp');
