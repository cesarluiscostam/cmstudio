/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { z, ZodType } from 'zod';

export function validateBody(schema: ZodType) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0]?.message || 'Dados inválidos.' });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0]?.message || 'Parâmetros inválidos.' });
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD.');
const timeStr = z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM.');
const nonEmpty = z.string().trim().min(1, 'Campo obrigatório.');
const positiveNumber = z.coerce.number().positive('Deve ser um número maior que zero.');

export const schemas = {
  login: z.object({
    email: z.string().trim().email('E-mail inválido.'),
    password: nonEmpty,
  }),

  changePassword: z.object({
    email: z.string().trim().email('E-mail inválido.'),
    password: z.string().optional(),
    newPassword: z.string().min(6, 'A nova senha deve ter ao menos 6 caracteres.'),
  }),

  register: z.object({
    name: nonEmpty,
    companyName: nonEmpty,
    email: z.string().trim().email('E-mail inválido.'),
    phone: z.string().optional(),
    password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.'),
  }),

  publicBooking: z.object({
    companyId: nonEmpty,
    name: nonEmpty,
    phone: nonEmpty,
    date: dateStr,
    time: timeStr,
    serviceIds: z.array(z.string()).min(1, 'Selecione ao menos um serviço.'),
    notes: z.string().optional(),
  }),

  createAppointment: z.object({
    clientId: nonEmpty,
    date: dateStr,
    time: timeStr,
    serviceIds: z.array(z.string()).min(1, 'Selecione ao menos um serviço.'),
    notes: z.string().optional(),
    status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  }),

  updateAppointment: z.object({
    clientId: z.string().optional(),
    date: dateStr.optional(),
    time: timeStr.optional(),
    serviceIds: z.array(z.string()).optional(),
    notes: z.string().optional(),
    status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  }),

  createClient: z.object({
    name: nonEmpty,
    phone: nonEmpty,
    birthDate: z.string().optional(),
    notes: z.string().optional(),
  }),

  updateClient: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    birthDate: z.string().optional(),
    notes: z.string().optional(),
  }),

  createService: z.object({
    name: nonEmpty,
    durationMin: positiveNumber,
    price: z.coerce.number().nonnegative('Preço não pode ser negativo.'),
    active: z.boolean().optional(),
  }),

  updateService: z.object({
    name: z.string().optional(),
    durationMin: z.coerce.number().positive().optional(),
    price: z.coerce.number().nonnegative().optional(),
    active: z.boolean().optional(),
  }),

  createTransaction: z.object({
    type: z.enum(['income', 'expense']),
    amount: positiveNumber,
    description: nonEmpty,
    category: nonEmpty,
    date: dateStr,
  }),

  createProduct: z.object({
    name: nonEmpty,
    price: z.coerce.number().nonnegative(),
    stock: z.coerce.number().int().nonnegative(),
  }),

  updateProduct: z.object({
    name: z.string().optional(),
    price: z.coerce.number().nonnegative().optional(),
    stock: z.coerce.number().int().nonnegative().optional(),
  }),

  createSale: z.object({
    productId: nonEmpty,
    quantity: z.coerce.number().int().positive('Quantidade deve ser maior que zero.'),
    date: dateStr,
  }),

  updateSettings: z.object({
    workDays: z.array(z.number().int().min(0).max(6)).optional(),
    openTime: timeStr.optional(),
    closeTime: timeStr.optional(),
    lunchStart: timeStr.optional(),
    lunchEnd: timeStr.optional(),
    slotIntervalMin: z.coerce.number().positive().optional(),
    allowOnlineBooking: z.boolean().optional(),
  }),

  createSaaSCompany: z.object({
    name: nonEmpty,
    slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens.'),
    phone: z.string().optional(),
    businessType: z.enum(['barbershop', 'beauty_salon', 'manicure', 'spa', 'other']).optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    subscriptionFee: z.coerce.number().nonnegative().optional(),
    managerName: nonEmpty,
    managerEmail: z.string().trim().email('E-mail do gerente inválido.'),
    managerPassword: z.string().min(6, 'A senha temporária deve ter ao menos 6 caracteres.'),
  }),

  updateSaaSCompany: z.object({
    name: z.string().optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    phone: z.string().optional(),
    businessType: z.enum(['barbershop', 'beauty_salon', 'manicure', 'spa', 'other']).optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    subscriptionFee: z.coerce.number().nonnegative().optional(),
  }),

  updateCompanyProfile: z.object({
    name: nonEmpty,
    logoUrl: z.string().optional(),
    coverPhotoUrl: z.string().optional(),
    businessType: z.enum(['barbershop', 'beauty_salon', 'manicure', 'spa', 'other']).optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    instagram: z.string().optional(),
  }),

  availabilityQuery: z.object({
    date: dateStr,
    durationMin: z.coerce.number().positive().optional(),
  }),
};
