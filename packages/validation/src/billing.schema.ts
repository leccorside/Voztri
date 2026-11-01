import { z } from 'zod';

export const RequestPayoutSchema = z.object({
  amountCents: z.number().int().positive('O valor deve ser positivo'),
  pixKey: z.string().min(5, 'Chave Pix obrigatória'),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']),
});

export const SubmitRatingSchema = z.object({
  rideId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  tipCents: z.number().int().min(0).default(0),
  feedbackText: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

export type RequestPayoutInput = z.infer<typeof RequestPayoutSchema>;
export type SubmitRatingInput = z.infer<typeof SubmitRatingSchema>;

