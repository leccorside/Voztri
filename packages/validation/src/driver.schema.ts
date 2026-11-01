import { z } from 'zod';

export const DriverRegistrationSchema = z.object({
  cnhNumber: z.string().min(8, 'Número da CNH inválido').max(20),
  cnhCategory: z.string().min(1, 'Categoria obrigatória (B, C, D, E)'),
  cnhExpiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD'),
  cnhHasEar: z.boolean().refine((val) => val === true, {
    message: 'A CNH deve obrigatoriamente possuir observação EAR (Exerce Atividade Remunerada) conforme lei 13.640/2018',
  }),
});

export const DriverVehicleSchema = z.object({
  brand: z.string().min(2, 'Marca obrigatória'),
  model: z.string().min(2, 'Modelo obrigatório'),
  year: z.number().min(2010, 'O veículo deve ter no máximo 15 anos de fabricação'),
  color: z.string().min(2, 'Cor obrigatória'),
  plate: z.string().regex(/^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/i, 'Placa inválida (Padrão Mercosul ou antigo)'),
  category: z.enum(['pop', 'black', 'mulher', 'moto']),
});

export const DriverLocationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).default(0),
  speed: z.number().min(0).default(0),
});

export type DriverRegistrationInput = z.infer<typeof DriverRegistrationSchema>;
export type DriverVehicleInput = z.infer<typeof DriverVehicleSchema>;
export type DriverLocationUpdateInput = z.infer<typeof DriverLocationUpdateSchema>;

