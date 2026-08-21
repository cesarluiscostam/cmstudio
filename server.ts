/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { dbOperations } from './server/db';
import { hashPassword, verifyPassword, signToken, sanitizeUser, requireAuth, requireRole } from './server/auth';
import { Appointment, Client, Service } from './src/types';
import { getTodayStr } from './src/lib/date';
import { hasTimeConflict, generateAvailableSlots, isWorkDay } from './src/lib/scheduling';
import { validateBody, validateQuery, schemas } from './server/validation';
import { uploadLogo, uploadCoverPhoto, UPLOADS_DIR } from './server/upload';
import { sendSms } from './server/sms';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// Wraps async route handlers so rejected promises become 500s instead of hanging the request.
function ah(fn: (req: express.Request, res: express.Response) => Promise<any>) {
  return (req: express.Request, res: express.Response) => {
    fn(req, res).catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    });
  };
}

// Tenant identity now comes from the verified JWT (set by requireAuth), never from client-supplied headers.
function getTenant(req: express.Request) {
  return { companyId: req.auth!.companyId, userId: req.auth!.userId };
}

// Current wall-clock time in São Paulo as "HH:MM" — computed via a fixed UTC-3 shift (Brazil dropped
// DST in 2019) so it's correct regardless of the server process's own local timezone (Railway runs UTC).
function currentTimeStrBR(): string {
  const spTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return `${String(spTime.getUTCHours()).padStart(2, '0')}:${String(spTime.getUTCMinutes()).padStart(2, '0')}`;
}

// SMS copy helpers — shared by the public booking flow, the internal booking flow, and the reminder job below.
function formatApptDateBR(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00-03:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function buildBookingSms(companyName: string, apt: Appointment): string {
  const when = `${formatApptDateBR(apt.date)} às ${apt.time}`;
  const services = apt.serviceNames.join(', ');
  return apt.status === 'pending'
    ? `${companyName}: recebemos seu pedido de agendamento para ${when} (${services}). Em breve confirmamos!`
    : `${companyName}: seu agendamento para ${when} (${services}) está confirmado!`;
}

function buildReminderSms(companyName: string, apt: Appointment): string {
  return `${companyName}: lembrete! Seu horário é hoje às ${apt.time} (${apt.serviceNames.join(', ')}). Te esperamos!`;
}

// ==========================================
// PUBLIC API ENDPOINTS (For Customer Booking)
// ==========================================

app.get('/api/public/company/:slug', ah(async (req, res) => {
  const { slug } = req.params;
  const company = await dbOperations.getCompanyBySlug(slug);
  if (!company) {
    return res.status(404).json({ error: 'Barbearia não encontrada' });
  }
  const services = (await dbOperations.getServices(company.id)).filter(s => s.active);
  const settings = await dbOperations.getSettings(company.id);
  // Name/id only — never leak email, password hash, etc. to the public booking page.
  const staff = (await dbOperations.getUsers(company.id))
    .filter(u => u.role !== 'super_admin')
    .map(u => ({ id: u.id, name: u.name }));

  res.json({ company, services, settings, staff });
}));

// Real available time slots for a given date, so the public booking widget never offers a slot
// that's already taken (previously the frontend had no way to know booked times).
app.get('/api/public/company/:slug/availability', validateQuery(schemas.availabilityQuery), ah(async (req, res) => {
  const { slug } = req.params;
  const { date, durationMin, staffId } = (req as any).validatedQuery as { date: string; durationMin?: number; staffId?: string };

  const company = await dbOperations.getCompanyBySlug(slug);
  if (!company) {
    return res.status(404).json({ error: 'Barbearia não encontrada' });
  }

  const settings = await dbOperations.getSettings(company.id);
  if (!settings || !settings.allowOnlineBooking) {
    return res.json({ slots: [], reason: 'booking_disabled' });
  }
  if (!isWorkDay(settings, date)) {
    return res.json({ slots: [], reason: 'closed' });
  }

  // Scoped to one professional's own bookings when chosen — otherwise two barbers free at the same
  // moment would incorrectly block each other, since the whole shop doesn't share a single calendar.
  const bookedRanges = (await dbOperations.getAppointments(company.id))
    .filter(a => a.date === date && a.status !== 'cancelled')
    .filter(a => !staffId || a.staffId === staffId)
    .map(a => ({ time: a.time, totalDurationMin: a.totalDurationMin }));

  // Only exclude past times when browsing today — a future date has no "already passed" slots.
  const minTimeStr = date === getTodayStr() ? currentTimeStrBR() : undefined;
  const slots = generateAvailableSlots(settings, bookedRanges, durationMin, minTimeStr);
  res.json({ slots });
}));

app.post('/api/public/booking', validateBody(schemas.publicBooking), ah(async (req, res) => {
  const { companyId, name, phone, date, time, serviceIds, notes, staffId } = req.body;

  const clients = await dbOperations.getClients(companyId);
  let client = clients.find(c => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
  if (!client) {
    client = await dbOperations.createClient({
      id: `clt-${Date.now()}`,
      companyId,
      name,
      phone,
      totalSpent: 0,
      visitsCount: 0,
      createdAt: new Date().toISOString()
    });
  }

  const allServices = await dbOperations.getServices(companyId);
  const selectedServices = allServices.filter(s => serviceIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDurationMin = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const serviceNames = selectedServices.map(s => s.name);

  const settings = await dbOperations.getSettings(companyId);
  if (settings && !settings.allowOnlineBooking) {
    return res.status(400).json({ error: 'Esta barbearia não está aceitando agendamentos online no momento.' });
  }
  if (settings && !isWorkDay(settings, date)) {
    return res.status(400).json({ error: 'A barbearia não abre neste dia. Escolha outra data.' });
  }

  const appointments = (await dbOperations.getAppointments(companyId)).filter(
    a => a.date === date && a.status !== 'cancelled' && (!staffId || a.staffId === staffId)
  );

  if (hasTimeConflict(appointments, time, totalDurationMin)) {
    return res.status(400).json({ error: 'Este horário já está reservado. Escolha outro horário.' });
  }

  let staffName: string | undefined;
  if (staffId) {
    const staffUser = await dbOperations.getUserById(staffId);
    if (!staffUser || staffUser.companyId !== companyId) {
      return res.status(400).json({ error: 'Profissional inválido.' });
    }
    staffName = staffUser.name;
  }

  const apt: Appointment = await dbOperations.createAppointment({
    id: `apt-online-${Date.now()}`,
    companyId,
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone,
    date,
    time,
    serviceIds,
    serviceNames,
    totalPrice,
    totalDurationMin,
    status: 'pending',
    notes,
    staffId,
    staffName,
    createdAt: new Date().toISOString()
  });

  const company = await dbOperations.getCompanyById(companyId);
  await sendSms(apt.clientPhone, buildBookingSms(company?.name || 'CM Studio', apt));

  res.status(201).json({ appointment: apt, message: 'Agendamento solicitado com sucesso!' });
}));

// Self-service lookup so a customer can see/cancel their own bookings without an account — scoped by
// phone number (not just the appointment id) so a leaked/guessed id alone can't let a stranger cancel it.
app.get('/api/public/company/:slug/my-appointments', ah(async (req, res) => {
  const { slug } = req.params;
  const phone = String(req.query.phone || '');
  if (!phone.replace(/\D/g, '')) {
    return res.status(400).json({ error: 'Informe o telefone usado no agendamento.' });
  }

  const company = await dbOperations.getCompanyBySlug(slug);
  if (!company) {
    return res.status(404).json({ error: 'Barbearia não encontrada' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const todayStr = getTodayStr();
  const appointments = (await dbOperations.getAppointments(company.id))
    .filter(a => a.clientPhone.replace(/\D/g, '') === cleanPhone)
    .filter(a => a.status !== 'cancelled' && a.status !== 'completed')
    .filter(a => a.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  res.json({ appointments });
}));

app.post('/api/public/appointments/:id/cancel', validateBody(schemas.cancelByPhone), ah(async (req, res) => {
  const { id } = req.params;
  const { phone } = req.body;

  const apt = await dbOperations.getAppointmentById(id);
  if (!apt || apt.clientPhone.replace(/\D/g, '') !== phone.replace(/\D/g, '')) {
    return res.status(404).json({ error: 'Agendamento não encontrado.' });
  }
  if (apt.status === 'cancelled' || apt.status === 'completed') {
    return res.status(400).json({ error: 'Este agendamento não pode mais ser cancelado.' });
  }

  await dbOperations.updateAppointment(id, { status: 'cancelled' });
  res.json({ success: true });
}));

// ==========================================
// AUTH ENDPOINTS
// ==========================================

app.post('/api/auth/login', validateBody(schemas.login), ah(async (req, res) => {
  const { email, password } = req.body;

  const user = await dbOperations.getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password!))) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  const company = await dbOperations.getCompanyById(user.companyId);
  const settings = await dbOperations.getSettings(user.companyId);
  const token = signToken({ userId: user.id, companyId: user.companyId, role: user.role });

  res.json({ user: sanitizeUser(user), company, settings, token });
}));

app.post('/api/auth/change-password', validateBody(schemas.changePassword), ah(async (req, res) => {
  const { email, password, newPassword } = req.body;

  const user = await dbOperations.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  if (password && !(await verifyPassword(password, user.password!))) {
    return res.status(401).json({ error: 'Senha atual incorreta.' });
  }

  await dbOperations.updateUser(user.id, {
    password: await hashPassword(newPassword),
    needsPasswordChange: false
  });

  const updatedUser = await dbOperations.getUserByEmail(email);

  res.json({ success: true, user: sanitizeUser(updatedUser!) });
}));

// Self-service reset: a 6-digit code texted to the account's phone on file, valid for 15 minutes.
// Always responds the same way regardless of whether the email exists, so this can't be used to
// probe which emails have accounts.
app.post('/api/auth/forgot-password', validateBody(schemas.forgotPassword), ah(async (req, res) => {
  const { email } = req.body;
  const genericResponse = { message: 'Se o e-mail existir e tiver um telefone cadastrado, enviamos um código por SMS.' };

  const user = await dbOperations.getUserByEmail(email);
  if (!user || !user.phone) {
    return res.json(genericResponse);
  }

  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await dbOperations.setResetCode(user.id, code, expiresAt);
  await sendSms(user.phone, `CM Studio: seu código para redefinir a senha é ${code}. Válido por 15 minutos.`);

  res.json(genericResponse);
}));

app.post('/api/auth/reset-password-with-code', validateBody(schemas.resetPasswordWithCode), ah(async (req, res) => {
  const { email, code, newPassword } = req.body;

  const user = await dbOperations.getUserByEmail(email);
  if (!user) {
    return res.status(400).json({ error: 'Código inválido ou expirado.' });
  }

  const valid = await dbOperations.consumeResetCode(user.id, code);
  if (!valid) {
    return res.status(400).json({ error: 'Código inválido ou expirado.' });
  }

  await dbOperations.updateUser(user.id, {
    password: await hashPassword(newPassword),
    needsPasswordChange: false
  });

  res.json({ success: true });
}));

app.post('/api/auth/register', validateBody(schemas.register), ah(async (req, res) => {
  const { name, companyName, email, phone, password } = req.body;

  const existing = await dbOperations.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Este e-mail já está em uso.' });
  }

  const companyId = `comp-${Date.now()}`;
  const baseSlug = companyName.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  // Auto-disambiguate: two different barbershops can share a name (e.g. in different cities),
  // and forcing them to pick a different display name just to get a unique URL slug is unnecessary friction.
  let slug = baseSlug;
  if (await dbOperations.getCompanyBySlug(slug)) {
    slug = `${baseSlug}-${companyId.split('-')[1].slice(-5)}`;
  }

  const company = await dbOperations.createCompany({
    id: companyId,
    name: companyName,
    slug,
    phone: phone || '',
    businessType: 'barbershop',
    primaryColor: '#ba8b3f',
    secondaryColor: '#6f2f40',
    subscriptionFee: 149.90,
    createdAt: new Date().toISOString()
  });

  const user = await dbOperations.createUser({
    id: `user-${Date.now()}`,
    companyId,
    name,
    email,
    phone,
    role: 'manager',
    password: await hashPassword(password),
    needsPasswordChange: false, // user already chose their own password during self-signup
    createdAt: new Date().toISOString()
  });

  await dbOperations.createService({ id: `srv-1-${Date.now()}`, companyId, name: 'Corte Social', durationMin: 30, price: 40.00, active: true, createdAt: new Date().toISOString() });
  await dbOperations.createService({ id: `srv-2-${Date.now()}`, companyId, name: 'Barba', durationMin: 30, price: 30.00, active: true, createdAt: new Date().toISOString() });
  await dbOperations.createService({ id: `srv-3-${Date.now()}`, companyId, name: 'Cabelo + Barba', durationMin: 60, price: 65.00, active: true, createdAt: new Date().toISOString() });

  const settings = await dbOperations.updateSettings(companyId, {
    workDays: [1, 2, 3, 4, 5, 6],
    openTime: '09:00',
    closeTime: '19:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    slotIntervalMin: 30,
    allowOnlineBooking: true
  });

  const token = signToken({ userId: user.id, companyId, role: user.role });

  res.status(201).json({ user: sanitizeUser(user), company, settings, token });
}));

// ==========================================
// PROTECTED API ENDPOINTS (For SaaS Barbers)
// ==========================================

app.use('/api/dashboard-stats', requireAuth);
app.use('/api/appointments', requireAuth);
app.use('/api/clients', requireAuth);
app.use('/api/services', requireAuth);
app.use('/api/cash-flow', requireAuth);
app.use('/api/products', requireAuth);
app.use('/api/sales', requireAuth);
app.use('/api/settings', requireAuth);
app.use('/api/notifications', requireAuth);
app.use('/api/company/profile', requireAuth);

// Dashboard stats aggregation
app.get('/api/dashboard-stats', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const appointments = await dbOperations.getAppointments(companyId);
  const transactions = await dbOperations.getTransactions(companyId);
  const clients = await dbOperations.getClients(companyId);

  const todayStr = getTodayStr();
  const currentMonthPrefix = todayStr.substring(0, 7); // 'YYYY-MM'

  const todayApts = appointments.filter(a => a.date === todayStr);
  const confirmedToday = todayApts.filter(a => a.status === 'confirmed').length;
  const completedToday = todayApts.filter(a => a.status === 'completed').length;
  const pendingToday = todayApts.filter(a => a.status === 'pending').length;

  const incomeToday = transactions
    .filter(t => t.date === todayStr && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const incomeMonth = transactions
    .filter(t => t.date.startsWith(currentMonthPrefix) && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const clientsServicedToday = completedToday;

  const completedAptsMonth = appointments.filter(a => a.date.startsWith(currentMonthPrefix) && a.status === 'completed');
  const totalSpentMonth = completedAptsMonth.reduce((sum, a) => sum + a.totalPrice, 0);
  const ticketAverage = completedAptsMonth.length > 0 ? (totalSpentMonth / completedAptsMonth.length) : 0;

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const cashBalance = totalIncome - totalExpense;

  const nextClientApt = todayApts
    .filter(a => a.status === 'confirmed')
    .sort((a, b) => a.time.localeCompare(b.time))[0] || null;

  // Faturamento diário dos últimos 15 dias (até hoje) — combina com o rótulo "Últimos 15 dias" no dashboard
  const dailyRevenueMap: Record<string, number> = {};
  const todayDateObj = new Date(`${todayStr}T00:00:00`);
  for (let i = 14; i >= 0; i--) {
    const d = new Date(todayDateObj);
    d.setDate(d.getDate() - i);
    dailyRevenueMap[getTodayStr(d)] = 0;
  }
  transactions
    .filter(t => t.type === 'income' && dailyRevenueMap[t.date] !== undefined)
    .forEach(t => {
      dailyRevenueMap[t.date] += t.amount;
    });
  // dailyRevenueMap keys were inserted in chronological order above (oldest to newest) and
  // Object.entries preserves insertion order, so no re-sort here — sorting by the "DD/MM"
  // display label instead of the real date breaks whenever the 15-day window crosses a month
  // boundary (e.g. "01/08" sorts before "20/07" alphabetically, even though it's later).
  const revenueChart = Object.entries(dailyRevenueMap).map(([date, amount]) => ({
    date: date.substring(8, 10) + '/' + date.substring(5, 7),
    amount
  }));

  const servicesMap: Record<string, number> = {};
  appointments
    .filter(a => a.status === 'completed')
    .forEach(a => {
      a.serviceNames.forEach(name => {
        servicesMap[name] = (servicesMap[name] || 0) + 1;
      });
    });
  const servicesChart = Object.entries(servicesMap).map(([name, count]) => ({ name, count }));

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const busyDaysMap: Record<string, number> = { 'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0 };
  appointments
    .filter(a => a.status === 'completed' || a.status === 'confirmed')
    .forEach(a => {
      const dateObj = new Date(`${a.date}T00:00:00`);
      const dayName = daysOfWeek[dateObj.getDay()];
      busyDaysMap[dayName] = (busyDaysMap[dayName] || 0) + 1;
    });
  const busyDaysChart = Object.entries(busyDaysMap).map(([name, count]) => ({ name, count }));

  // Clientes que já vieram pelo menos uma vez mas não voltam há 30+ dias — ordenados do mais tempo sumido pro mais recente
  const INACTIVE_DAYS_THRESHOLD = 30;
  const inactiveClients = clients
    .filter(c => c.lastVisitAt)
    .map(c => ({
      ...c,
      daysSinceVisit: Math.floor((todayDateObj.getTime() - new Date(c.lastVisitAt as string).getTime()) / (1000 * 60 * 60 * 24))
    }))
    .filter(c => c.daysSinceVisit >= INACTIVE_DAYS_THRESHOLD)
    .sort((a, b) => b.daysSinceVisit - a.daysSinceVisit)
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      daysSinceVisit: c.daysSinceVisit
    }));

  res.json({
    stats: {
      appointmentsToday: confirmedToday + completedToday + pendingToday,
      confirmedToday,
      completedToday,
      pendingToday,
      revenueToday: incomeToday,
      revenueMonth: incomeMonth,
      clientsServicedToday,
      ticketAverage,
      cashBalance,
      nextClient: nextClientApt,
      inactiveClients
    },
    charts: {
      revenueChart,
      servicesChart,
      busyDaysChart
    }
  });
}));

// APPOINTMENTS
app.get('/api/appointments', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  res.json(await dbOperations.getAppointments(companyId));
}));

app.post('/api/appointments', validateBody(schemas.createAppointment), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { clientId, date, time, serviceIds, notes, status, staffId } = req.body;

  const client = await dbOperations.getClientById(clientId);
  if (!client || client.companyId !== companyId) {
    return res.status(404).json({ error: 'Cliente não encontrado.' });
  }

  let staffName: string | undefined;
  if (staffId) {
    const staffUser = await dbOperations.getUserById(staffId);
    if (!staffUser || staffUser.companyId !== companyId) {
      return res.status(400).json({ error: 'Profissional inválido.' });
    }
    staffName = staffUser.name;
  }

  const allServices = await dbOperations.getServices(companyId);
  const selectedServices = allServices.filter(s => serviceIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDurationMin = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const serviceNames = selectedServices.map(s => s.name);

  // Scoped to the chosen professional's own bookings, same reasoning as the public availability endpoint.
  const appointments = (await dbOperations.getAppointments(companyId)).filter(
    a => a.date === date && a.status !== 'cancelled' && (!staffId || a.staffId === staffId)
  );

  if (hasTimeConflict(appointments, time, totalDurationMin)) {
    return res.status(400).json({ error: 'Conflito de horário! Este horário se sobrepõe com outra reserva.' });
  }

  const apt = await dbOperations.createAppointment({
    id: `apt-${Date.now()}`,
    companyId,
    clientId,
    clientName: client.name,
    clientPhone: client.phone,
    date,
    time,
    serviceIds,
    serviceNames,
    totalPrice,
    totalDurationMin,
    status: status || 'confirmed',
    notes,
    staffId,
    staffName,
    createdAt: new Date().toISOString()
  });

  const company = await dbOperations.getCompanyById(companyId);
  await sendSms(apt.clientPhone, buildBookingSms(company?.name || 'CM Studio', apt));

  res.status(201).json(apt);
}));

app.put('/api/appointments/:id', validateBody(schemas.updateAppointment), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { id } = req.params;
  const apt = await dbOperations.getAppointmentById(id);

  if (!apt || apt.companyId !== companyId) {
    return res.status(404).json({ error: 'Agendamento não encontrado.' });
  }

  const updateData = { ...req.body };
  if (updateData.serviceIds) {
    const allServices = await dbOperations.getServices(companyId);
    const selectedServices = allServices.filter(s => updateData.serviceIds.includes(s.id));
    updateData.totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
    updateData.totalDurationMin = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
    updateData.serviceNames = selectedServices.map(s => s.name);
  }
  if ('staffId' in updateData) {
    if (updateData.staffId) {
      const staffUser = await dbOperations.getUserById(updateData.staffId);
      if (!staffUser || staffUser.companyId !== companyId) {
        return res.status(400).json({ error: 'Profissional inválido.' });
      }
      updateData.staffName = staffUser.name;
    } else {
      updateData.staffName = undefined;
    }
  }

  const updated = await dbOperations.updateAppointment(id, updateData);
  res.json(updated);
}));

app.delete('/api/appointments/:id', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { id } = req.params;
  const apt = await dbOperations.getAppointmentById(id);

  if (!apt || apt.companyId !== companyId) {
    return res.status(404).json({ error: 'Agendamento não encontrado.' });
  }

  await dbOperations.deleteAppointment(id);
  res.json({ success: true });
}));

// CLIENTS
app.get('/api/clients', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  res.json(await dbOperations.getClients(companyId));
}));

app.post('/api/clients', validateBody(schemas.createClient), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { name, phone, birthDate, notes } = req.body;

  const client = await dbOperations.createClient({
    id: `clt-${Date.now()}`,
    companyId,
    name,
    phone,
    birthDate,
    notes,
    totalSpent: 0,
    visitsCount: 0,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(client);
}));

app.put('/api/clients/:id', validateBody(schemas.updateClient), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { id } = req.params;
  const client = await dbOperations.getClientById(id);

  if (!client || client.companyId !== companyId) {
    return res.status(404).json({ error: 'Cliente não encontrado.' });
  }

  const updated = await dbOperations.updateClient(id, req.body);
  res.json(updated);
}));

app.delete('/api/clients/:id', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { id } = req.params;
  const client = await dbOperations.getClientById(id);

  if (!client || client.companyId !== companyId) {
    return res.status(404).json({ error: 'Cliente não encontrado.' });
  }

  await dbOperations.deleteClient(id);
  res.json({ success: true });
}));

// SERVICES
app.get('/api/services', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  res.json(await dbOperations.getServices(companyId));
}));

app.post('/api/services', validateBody(schemas.createService), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { name, durationMin, price, active } = req.body;

  const srv = await dbOperations.createService({
    id: `srv-${Date.now()}`,
    companyId,
    name,
    durationMin,
    price,
    active: active !== undefined ? active : true,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(srv);
}));

app.put('/api/services/:id', validateBody(schemas.updateService), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { id } = req.params;
  const srv = await dbOperations.getServiceById(id);

  if (!srv || srv.companyId !== companyId) {
    return res.status(404).json({ error: 'Serviço não encontrado.' });
  }

  const updated = await dbOperations.updateService(id, req.body);
  res.json(updated);
}));

app.delete('/api/services/:id', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { id } = req.params;
  const srv = await dbOperations.getServiceById(id);

  if (!srv || srv.companyId !== companyId) {
    return res.status(404).json({ error: 'Serviço não encontrado.' });
  }

  await dbOperations.deleteService(id);
  res.json({ success: true });
}));

// CASH FLOW
app.get('/api/cash-flow', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  res.json(await dbOperations.getTransactions(companyId));
}));

app.post('/api/cash-flow', validateBody(schemas.createTransaction), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { type, amount, description, category, date } = req.body;

  const tx = await dbOperations.createTransaction({
    id: `tx-${Date.now()}`,
    companyId,
    type,
    amount,
    description,
    category,
    date,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(tx);
}));

app.delete('/api/cash-flow/:id', ah(async (req, res) => {
  await dbOperations.deleteTransaction(req.params.id);
  res.json({ success: true });
}));

// PRODUCTS & SALES
app.get('/api/products', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  res.json(await dbOperations.getProducts(companyId));
}));

app.post('/api/products', validateBody(schemas.createProduct), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { name, price, stock, minStock } = req.body;

  const prod = await dbOperations.createProduct({
    id: `prod-${Date.now()}`,
    companyId,
    name,
    price,
    stock,
    minStock: minStock ?? 5,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(prod);
}));

app.put('/api/products/:id', validateBody(schemas.updateProduct), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { id } = req.params;
  const prod = await dbOperations.getProductById(id);

  if (!prod || prod.companyId !== companyId) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  const updated = await dbOperations.updateProduct(id, req.body);
  res.json(updated);
}));

app.delete('/api/products/:id', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { id } = req.params;
  const prod = await dbOperations.getProductById(id);

  if (!prod || prod.companyId !== companyId) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  await dbOperations.deleteProduct(id);
  res.json({ success: true });
}));

app.get('/api/sales', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  res.json(await dbOperations.getSales(companyId));
}));

app.post('/api/sales', validateBody(schemas.createSale), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { productId, quantity, date } = req.body;

  const product = await dbOperations.getProductById(productId);
  if (!product || product.companyId !== companyId) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  if (product.stock < quantity) {
    return res.status(400).json({ error: 'Estoque insuficiente.' });
  }

  const sale = await dbOperations.createSale({
    id: `sale-${Date.now()}`,
    companyId,
    productId,
    productName: product.name,
    quantity,
    totalPrice: product.price * quantity,
    date,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(sale);
}));

// SETTINGS
app.get('/api/settings', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  res.json(await dbOperations.getSettings(companyId));
}));

app.put('/api/settings', validateBody(schemas.updateSettings), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  res.json(await dbOperations.updateSettings(companyId, req.body));
}));

// NOTIFICATIONS
app.get('/api/notifications', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  res.json(await dbOperations.getNotifications(companyId));
}));

app.post('/api/notifications/read-all', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  await dbOperations.markAllNotificationsRead(companyId);
  res.json({ success: true });
}));

// ==========================================
// SAAS APP ADMINISTRATOR ENDPOINTS
// ==========================================

app.use('/api/saas', requireAuth, requireRole('super_admin'));

app.get('/api/saas/dashboard', ah(async (req, res) => {
  const companies = await dbOperations.getCompanies();
  const now = new Date();
  const currentMonthPrefix = getTodayStr(now).substring(0, 7);

  const enrichedCompanies = await Promise.all(companies.map(async (comp) => {
    const clients = await dbOperations.getClients(comp.id);
    const appointments = await dbOperations.getAppointments(comp.id);
    const transactions = await dbOperations.getTransactions(comp.id);

    const companyMonthlyRevenue = transactions
      .filter(t => t.date.startsWith(currentMonthPrefix) && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const compUsers = await dbOperations.getUsers(comp.id);
    const manager = compUsers.find(u => u.role === 'manager' || u.role === 'admin');

    return {
      ...comp,
      clientsCount: clients.length,
      appointmentsCount: appointments.length,
      monthlyRevenue: companyMonthlyRevenue,
      managerEmail: manager ? manager.email : 'Sem gerente',
      managerName: manager ? manager.name : 'Sem nome',
      users: compUsers.map(sanitizeUser)
    };
  }));

  const totalSaaSEarnings = companies.reduce((sum, c) => sum + (c.subscriptionFee || 0), 0);

  res.json({
    companies: enrichedCompanies,
    totalSaaSEarnings,
    companiesCount: companies.length,
    monthName: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  });
}));

app.post('/api/saas/companies', validateBody(schemas.createSaaSCompany), ah(async (req, res) => {
  const { name, slug, phone, businessType, primaryColor, secondaryColor, subscriptionFee, managerName, managerEmail, managerPassword } = req.body;

  const existingComp = await dbOperations.getCompanyBySlug(slug);
  if (existingComp) {
    return res.status(400).json({ error: 'Já existe uma empresa com este link de acesso (Slug).' });
  }

  const existingUser = await dbOperations.getUserByEmail(managerEmail);
  if (existingUser) {
    return res.status(400).json({ error: 'Este e-mail de gerente já está cadastrado.' });
  }

  const companyId = `comp-${Date.now()}`;
  const company = await dbOperations.createCompany({
    id: companyId,
    name,
    slug,
    phone: phone || '',
    businessType: businessType || 'barbershop',
    primaryColor: primaryColor || '#ba8b3f',
    secondaryColor: secondaryColor || '#6f2f40',
    subscriptionFee: subscriptionFee ? Number(subscriptionFee) : 149.90,
    createdAt: new Date().toISOString()
  });

  const user = await dbOperations.createUser({
    id: `user-${Date.now()}`,
    companyId,
    name: managerName,
    email: managerEmail,
    role: 'manager',
    password: await hashPassword(managerPassword),
    needsPasswordChange: true,
    createdAt: new Date().toISOString()
  });

  if (businessType === 'beauty_salon') {
    await dbOperations.createService({ id: `srv-1-${Date.now()}`, companyId, name: 'Corte Feminino', durationMin: 45, price: 70.00, active: true, createdAt: new Date().toISOString() });
    await dbOperations.createService({ id: `srv-2-${Date.now()}`, companyId, name: 'Manicure Express', durationMin: 30, price: 35.00, active: true, createdAt: new Date().toISOString() });
  } else if (businessType === 'manicure') {
    await dbOperations.createService({ id: `srv-1-${Date.now()}`, companyId, name: 'Pé e Mão Completo', durationMin: 60, price: 60.00, active: true, createdAt: new Date().toISOString() });
    await dbOperations.createService({ id: `srv-2-${Date.now()}`, companyId, name: 'Esmaltação em Gel', durationMin: 30, price: 40.00, active: true, createdAt: new Date().toISOString() });
  } else {
    await dbOperations.createService({ id: `srv-1-${Date.now()}`, companyId, name: 'Corte Tradicional', durationMin: 30, price: 40.00, active: true, createdAt: new Date().toISOString() });
    await dbOperations.createService({ id: `srv-2-${Date.now()}`, companyId, name: 'Barba Terapia', durationMin: 30, price: 30.00, active: true, createdAt: new Date().toISOString() });
  }

  await dbOperations.updateSettings(companyId, {
    workDays: [1, 2, 3, 4, 5, 6],
    openTime: '09:00',
    closeTime: '19:00',
    slotIntervalMin: 30,
    allowOnlineBooking: true
  });

  res.status(201).json({ company, user: sanitizeUser(user) });
}));

app.put('/api/saas/companies/:id', validateBody(schemas.updateSaaSCompany), ah(async (req, res) => {
  const { id } = req.params;
  const { name, slug, phone, businessType, primaryColor, secondaryColor, subscriptionFee } = req.body;

  const existing = await dbOperations.getCompanyById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Empresa não encontrada.' });
  }

  if (slug && slug !== existing.slug) {
    const duplicate = await dbOperations.getCompanyBySlug(slug);
    if (duplicate) {
      return res.status(400).json({ error: 'Já existe outra empresa com este slug.' });
    }
  }

  const updated = await dbOperations.updateCompany(id, {
    name,
    slug,
    phone,
    businessType,
    primaryColor,
    secondaryColor,
    subscriptionFee: subscriptionFee ? Number(subscriptionFee) : undefined
  });

  res.json(updated);
}));

app.delete('/api/saas/companies/:id', ah(async (req, res) => {
  const { id } = req.params;
  const existing = await dbOperations.getCompanyById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Empresa não encontrada.' });
  }

  await dbOperations.deleteCompany(id);
  res.json({ success: true, message: 'Empresa e todos os seus dados vinculados foram removidos.' });
}));

// Generates a temporary password for a user who's locked out (no self-service e-mail flow exists yet).
// The plain-text password is returned once so the super admin can relay it to the user directly;
// needsPasswordChange forces them through the existing forced-change screen on next login.
app.post('/api/saas/users/:id/reset-password', ah(async (req, res) => {
  const { id } = req.params;
  const user = await dbOperations.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const tempPassword = crypto.randomBytes(6).toString('base64url');
  await dbOperations.updateUser(id, {
    password: await hashPassword(tempPassword),
    needsPasswordChange: true
  });

  res.json({ tempPassword });
}));

// ==========================================
// GERENTE (MANAGER) ENDPOINTS
// ==========================================

app.put('/api/company/profile', validateBody(schemas.updateCompanyProfile), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { name, logoUrl, coverPhotoUrl, businessType, primaryColor, secondaryColor, backgroundColor, menuColor, textColor, phone, address, instagram } = req.body;

  const updated = await dbOperations.updateCompany(companyId, {
    name,
    logoUrl,
    coverPhotoUrl,
    businessType,
    primaryColor,
    secondaryColor,
    backgroundColor,
    menuColor,
    textColor,
    phone,
    address,
    instagram
  });

  res.json(updated);
}));

// Uploads a logo image file and returns its public URL. Does not touch the company row itself —
// the frontend sends the returned URL along in the next PUT /api/company/profile, same as if the
// user had pasted an external URL.
app.post('/api/company/logo', requireAuth, (req, res) => {
  uploadLogo(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Erro ao enviar a imagem.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    res.json({ logoUrl: `/uploads/${req.file.filename}` });
  });
});

// Same pattern as the logo upload above — returns the URL, doesn't touch the company row.
app.post('/api/company/cover-photo', requireAuth, (req, res) => {
  uploadCoverPhoto(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Erro ao enviar a imagem.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    res.json({ coverPhotoUrl: `/uploads/${req.file.filename}` });
  });
});

// ==========================================
// TEAM (STAFF MANAGEMENT)
// ==========================================

app.use('/api/team', requireAuth, requireRole('manager', 'admin'));

app.get('/api/team', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const users = await dbOperations.getUsers(companyId);
  res.json(users.map(sanitizeUser));
}));

app.post('/api/team', validateBody(schemas.createTeamMember), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { name, email, phone, password, commissionPercent } = req.body;

  const existing = await dbOperations.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
  }

  const user = await dbOperations.createUser({
    id: `user-${Date.now()}`,
    companyId,
    name,
    email,
    phone,
    role: 'staff',
    password: await hashPassword(password),
    needsPasswordChange: false,
    commissionPercent,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(sanitizeUser(user));
}));

app.put('/api/team/:id', validateBody(schemas.updateTeamMember), ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const { id } = req.params;
  const member = await dbOperations.getUserById(id);

  if (!member || member.companyId !== companyId) {
    return res.status(404).json({ error: 'Membro da equipe não encontrado.' });
  }

  const updated = await dbOperations.updateUser(id, req.body);
  res.json(sanitizeUser(updated!));
}));

app.delete('/api/team/:id', ah(async (req, res) => {
  const { companyId, userId } = getTenant(req);
  const { id } = req.params;
  const member = await dbOperations.getUserById(id);

  if (!member || member.companyId !== companyId) {
    return res.status(404).json({ error: 'Membro da equipe não encontrado.' });
  }
  if (id === userId) {
    return res.status(400).json({ error: 'Você não pode remover o seu próprio acesso.' });
  }

  await dbOperations.deleteUser(id);
  res.json({ success: true });
}));

// Per-staff commission report for a given month (defaults to the current one) — computed on the fly
// from completed appointments rather than stored per-transaction, since it only needs to reflect
// today's commissionPercent and appointment data, not a historical snapshot.
app.get('/api/team/commissions', ah(async (req, res) => {
  const { companyId } = getTenant(req);
  const month = typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
    ? req.query.month
    : getTodayStr().substring(0, 7);

  const [team, appointments] = await Promise.all([
    dbOperations.getUsers(companyId),
    dbOperations.getAppointments(companyId)
  ]);

  const completedThisMonth = appointments.filter(a => a.status === 'completed' && a.date.startsWith(month));

  const report = team
    .filter(u => u.role !== 'super_admin')
    .map(u => {
      const own = completedThisMonth.filter(a => a.staffId === u.id);
      const totalRevenue = own.reduce((sum, a) => sum + a.totalPrice, 0);
      const commissionPercent = u.commissionPercent ?? 0;
      return {
        staffId: u.id,
        staffName: u.name,
        commissionPercent,
        completedCount: own.length,
        totalRevenue,
        commissionOwed: totalRevenue * (commissionPercent / 100)
      };
    });

  res.json({ month, report });
}));

// ==========================================
// SMS REMINDER BACKGROUND JOB
// ==========================================

const REMINDER_CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Polls confirmed appointments starting in ~1h and texts a reminder once per appointment.
// São Paulo has been UTC-3 year-round since 2019 (no DST), so the offset below is safe to hardcode.
async function checkAndSendReminders() {
  try {
    const candidates = await dbOperations.getAppointmentsNeedingReminderCheck(getTodayStr());
    const now = Date.now();
    for (const apt of candidates) {
      const aptMoment = new Date(`${apt.date}T${apt.time}:00-03:00`).getTime();
      const minutesUntil = (aptMoment - now) / 60000;
      if (minutesUntil <= 65 && minutesUntil >= 50) {
        const company = await dbOperations.getCompanyById(apt.companyId);
        await sendSms(apt.clientPhone, buildReminderSms(company?.name || 'CM Studio', apt));
        await dbOperations.markReminderSent(apt.id);
      }
    }
  } catch (err) {
    console.error('[reminder] Erro ao verificar lembretes:', err);
  }
}

// ==========================================
// VITE CLIENT INTEGRATION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    checkAndSendReminders();
    setInterval(checkAndSendReminders, REMINDER_CHECK_INTERVAL_MS);
  });
}

startServer();
