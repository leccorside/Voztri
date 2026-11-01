import { z } from 'zod';

export const RequestOtpSchema = z.object({
  phone: z
    .string()
    .min(10, 'Telefone deve conter no mínimo 10 dígitos com DDD')
    .max(15, 'Telefone inválido')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Formato de telefone internacional E.164 ou nacional inválido'),
  role: z.enum(['passenger', 'driver', 'admin']).default('passenger'),
});

export const VerifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().length(6, 'O código de verificação deve conter 6 dígitos'),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve conter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido').optional().nullable(),
  cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido').optional().nullable(),
});

export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
