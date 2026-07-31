/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Creates the schema (if missing) and seeds demo data (only if the companies table is empty).
 * Run with: npm run migrate
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { pool } from './pool';

async function runSchema() {
  const schemaPath = path.join(process.cwd(), 'server', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Schema aplicado.');
}

async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM companies');
  if (rows[0].count > 0) {
    console.log('Banco já contém dados, seed ignorado.');
    return;
  }

  console.log('Banco vazio, inserindo dados de demonstração...');

  const now = new Date().toISOString();
  const hash = (plain: string) => bcrypt.hashSync(plain, 10);

  const companies = [
    { id: 'comp-1', name: 'CM Studio', slug: 'barberflow', phone: '(11) 99999-1234', address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP', instagram: '@cmstudio', businessType: 'barbershop', primaryColor: '#ba8b3f', secondaryColor: '#6f2f40', subscriptionFee: 149.90 },
    { id: 'comp-2', name: 'Navalha & Bigode', slug: 'navalha-bigode', phone: '(11) 98888-4321', address: 'Rua Augusta, 450 - Consolação, São Paulo - SP', instagram: '@navalhabigode', businessType: 'barbershop', primaryColor: '#b45309', secondaryColor: '#78350f', subscriptionFee: 149.90 },
    { id: 'comp-3', name: 'Studio Bella - Salão & Estética', slug: 'studio-bella', phone: '(11) 97777-1111', address: 'Av. Brigadeiro Luís Antônio, 2200 - Jardins, São Paulo - SP', instagram: '@studio_bella_estetica', businessType: 'beauty_salon', primaryColor: '#db2777', secondaryColor: '#831843', subscriptionFee: 199.90 },
    { id: 'comp-4', name: 'Unhas de Fibra & Manicure Express', slug: 'unhas-de-fibra', phone: '(11) 96666-2222', address: 'Rua Pamplona, 120 - Jardim Paulista, São Paulo - SP', instagram: '@unhas_fibra_express', businessType: 'manicure', primaryColor: '#ec4899', secondaryColor: '#9d174d', subscriptionFee: 99.90 },
  ];
  for (const c of companies) {
    await pool.query(
      `INSERT INTO companies (id, name, slug, phone, address, instagram, business_type, primary_color, secondary_color, subscription_fee, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [c.id, c.name, c.slug, c.phone, c.address, c.instagram, c.businessType, c.primaryColor, c.secondaryColor, c.subscriptionFee, now]
    );
  }

  const users = [
    { id: 'user-super-admin', companyId: 'comp-saas', name: 'Cesar Administrador', email: 'admin@saas.com', phone: '(11) 98888-8888', role: 'super_admin', password: hash('admin123') },
    { id: 'user-admin', companyId: 'comp-1', name: 'Carlos Silva', email: 'admin@barberflow.com', phone: '(11) 99999-1111', role: 'manager', password: hash('admin123') },
    { id: 'user-barber1', companyId: 'comp-1', name: 'Felipe Santos', email: 'felipe@barberflow.com', phone: '(11) 99999-2222', role: 'staff', password: hash('felipe123') },
    { id: 'user-navalha', companyId: 'comp-2', name: 'Pedro Navalha', email: 'pedro@navalha.com', phone: null, role: 'manager', password: hash('admin123') },
    { id: 'user-bella', companyId: 'comp-3', name: 'Isabella Rocha', email: 'isabella@studiobella.com', phone: '(11) 97777-3333', role: 'manager', password: hash('admin123') },
    { id: 'user-manicure', companyId: 'comp-4', name: 'Juliana Unhas', email: 'juliana@unhasfibra.com', phone: '(11) 96666-4444', role: 'manager', password: hash('admin123') },
  ];
  for (const u of users) {
    await pool.query(
      `INSERT INTO users (id, company_id, name, email, phone, role, password_hash, needs_password_change, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8)`,
      [u.id, u.companyId, u.name, u.email, u.phone, u.role, u.password, now]
    );
  }

  const settings = [
    { companyId: 'comp-1', workDays: [1,2,3,4,5,6], openTime: '09:00', closeTime: '19:00', lunchStart: '12:00', lunchEnd: '13:00', slotIntervalMin: 30 },
    { companyId: 'comp-2', workDays: [2,3,4,5,6,0], openTime: '10:00', closeTime: '21:00', lunchStart: '13:00', lunchEnd: '14:00', slotIntervalMin: 30 },
    { companyId: 'comp-3', workDays: [1,2,3,4,5,6], openTime: '08:00', closeTime: '20:00', lunchStart: '12:00', lunchEnd: '13:00', slotIntervalMin: 45 },
    { companyId: 'comp-4', workDays: [2,3,4,5,6,0], openTime: '09:00', closeTime: '18:00', lunchStart: '12:00', lunchEnd: '13:00', slotIntervalMin: 30 },
  ];
  for (const s of settings) {
    await pool.query(
      `INSERT INTO settings (company_id, work_days, open_time, close_time, lunch_start, lunch_end, slot_interval_min, allow_online_booking)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
      [s.companyId, JSON.stringify(s.workDays), s.openTime, s.closeTime, s.lunchStart, s.lunchEnd, s.slotIntervalMin]
    );
  }

  const services = [
    { id: 'srv-1', companyId: 'comp-1', name: 'Corte Degradê', durationMin: 30, price: 45.00 },
    { id: 'srv-2', companyId: 'comp-1', name: 'Barba Completa', durationMin: 30, price: 35.00 },
    { id: 'srv-3', companyId: 'comp-1', name: 'Combo: Corte + Barba', durationMin: 60, price: 70.00 },
    { id: 'srv-4', companyId: 'comp-1', name: 'Sobrancelha Navalhada', durationMin: 15, price: 15.00 },
    { id: 'srv-5', companyId: 'comp-1', name: 'Selagem / Progressiva', durationMin: 90, price: 120.00 },
    { id: 'srv-6', companyId: 'comp-1', name: 'Pigmentação Barba', durationMin: 30, price: 25.00 },
    { id: 'srv-nav-1', companyId: 'comp-2', name: 'Corte Navalha', durationMin: 45, price: 50.00 },
    { id: 'srv-bella-1', companyId: 'comp-3', name: 'Corte Feminino & Escova', durationMin: 45, price: 80.00 },
    { id: 'srv-bella-2', companyId: 'comp-3', name: 'Luzes / Mechas Completas', durationMin: 120, price: 250.00 },
    { id: 'srv-bella-3', companyId: 'comp-3', name: 'Pé & Mão Simples', durationMin: 45, price: 55.00 },
    { id: 'srv-fib-1', companyId: 'comp-4', name: 'Alongamento de Unha em Fibra', durationMin: 90, price: 130.00 },
    { id: 'srv-fib-2', companyId: 'comp-4', name: 'Manutenção Fibra de Vidro', durationMin: 60, price: 85.00 },
    { id: 'srv-fib-3', companyId: 'comp-4', name: 'Blindagem de Unhas', durationMin: 30, price: 50.00 },
  ];
  for (const s of services) {
    await pool.query(
      `INSERT INTO services (id, company_id, name, duration_min, price, active, created_at) VALUES ($1,$2,$3,$4,$5,true,$6)`,
      [s.id, s.companyId, s.name, s.durationMin, s.price, now]
    );
  }

  const clients = [
    { id: 'clt-1', companyId: 'comp-1', name: 'Guilherme Souza', phone: '(11) 91111-2222', birthDate: '1995-04-12', notes: 'Gosta de corte degradê bem alto, finalizado com pomada mate.', totalSpent: 225.00, visitsCount: 5, lastVisitAt: '2026-07-10T14:00:00Z' },
    { id: 'clt-2', companyId: 'comp-1', name: 'Arthur Lima', phone: '(11) 92222-3333', birthDate: '1988-11-23', notes: 'Alérgico a lâmina de barbear na região do pescoço, usar máquina zero.', totalSpent: 140.00, visitsCount: 2, lastVisitAt: '2026-07-08T10:30:00Z' },
    { id: 'clt-3', companyId: 'comp-1', name: 'Rafael Costa', phone: '(11) 93333-4444', birthDate: '2001-08-05', notes: 'Sobrancelha bem marcada. Fazer risco no corte.', totalSpent: 60.00, visitsCount: 1, lastVisitAt: '2026-07-05T16:00:00Z' },
    { id: 'clt-4', companyId: 'comp-1', name: 'Lucas Mendes', phone: '(11) 94444-5555', birthDate: '1992-02-18', notes: 'Apenas barba com toalha quente.', totalSpent: 105.00, visitsCount: 3, lastVisitAt: '2026-07-12T11:00:00Z' },
    { id: 'clt-5', companyId: 'comp-1', name: 'Gustavo Oliveira', phone: '(11) 95555-6666', birthDate: '1997-09-30', notes: 'Usa cabelo longo, aparar apenas pontas.', totalSpent: 45.00, visitsCount: 1, lastVisitAt: '2026-07-01T15:30:00Z' },
  ];
  for (const c of clients) {
    await pool.query(
      `INSERT INTO clients (id, company_id, name, phone, birth_date, notes, total_spent, visits_count, last_visit_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [c.id, c.companyId, c.name, c.phone, c.birthDate, c.notes, c.totalSpent, c.visitsCount, c.lastVisitAt, now]
    );
  }

  const products = [
    { id: 'prod-1', companyId: 'comp-1', name: 'Pomada Modeladora Mate (150g)', price: 35.00, stock: 12 },
    { id: 'prod-2', companyId: 'comp-1', name: 'Óleo para Barba Wood (30ml)', price: 40.00, stock: 8 },
    { id: 'prod-3', companyId: 'comp-1', name: 'Shampoo Mentolado Anticaspa', price: 45.00, stock: 5 },
  ];
  for (const p of products) {
    await pool.query(
      `INSERT INTO products (id, company_id, name, price, stock, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [p.id, p.companyId, p.name, p.price, p.stock, now]
    );
  }

  const todayStr = '2026-07-13';
  const appointments = [
    { id: 'apt-today-1', companyId: 'comp-1', clientId: 'clt-1', clientName: 'Guilherme Souza', clientPhone: '(11) 91111-2222', date: todayStr, time: '09:30', serviceIds: ['srv-1'], serviceNames: ['Corte Degradê'], totalPrice: 45.00, totalDurationMin: 30, status: 'confirmed', notes: 'Quer fazer risco na sobrancelha hoje também', createdAt: '2026-07-12T18:00:00Z' },
    { id: 'apt-today-2', companyId: 'comp-1', clientId: 'clt-2', clientName: 'Arthur Lima', clientPhone: '(11) 92222-3333', date: todayStr, time: '10:30', serviceIds: ['srv-3','srv-4'], serviceNames: ['Combo: Corte + Barba','Sobrancelha Navalhada'], totalPrice: 85.00, totalDurationMin: 75, status: 'confirmed', notes: '', createdAt: '2026-07-11T12:00:00Z' },
    { id: 'apt-today-3', companyId: 'comp-1', clientId: 'clt-4', clientName: 'Lucas Mendes', clientPhone: '(11) 94444-5555', date: todayStr, time: '14:00', serviceIds: ['srv-2'], serviceNames: ['Barba Completa'], totalPrice: 35.00, totalDurationMin: 30, status: 'confirmed', notes: 'Toalha quente extra se possível', createdAt: '2026-07-12T15:30:00Z' },
    { id: 'apt-today-4', companyId: 'comp-1', clientId: 'clt-3', clientName: 'Rafael Costa', clientPhone: '(11) 93333-4444', date: todayStr, time: '16:00', serviceIds: ['srv-1','srv-6'], serviceNames: ['Corte Degradê','Pigmentação Barba'], totalPrice: 70.00, totalDurationMin: 60, status: 'confirmed', notes: null, createdAt: '2026-07-12T20:00:00Z' },
    { id: 'apt-past-1', companyId: 'comp-1', clientId: 'clt-1', clientName: 'Guilherme Souza', clientPhone: '(11) 91111-2222', date: '2026-07-10', time: '14:00', serviceIds: ['srv-3'], serviceNames: ['Combo: Corte + Barba'], totalPrice: 70.00, totalDurationMin: 60, status: 'completed', notes: null, createdAt: '2026-07-09T10:00:00Z' },
    { id: 'apt-past-2', companyId: 'comp-1', clientId: 'clt-4', clientName: 'Lucas Mendes', clientPhone: '(11) 94444-5555', date: '2026-07-12', time: '11:00', serviceIds: ['srv-2'], serviceNames: ['Barba Completa'], totalPrice: 35.00, totalDurationMin: 30, status: 'completed', notes: null, createdAt: '2026-07-11T16:00:00Z' },
    { id: 'apt-past-3', companyId: 'comp-1', clientId: 'clt-2', clientName: 'Arthur Lima', clientPhone: '(11) 92222-3333', date: '2026-07-08', time: '10:30', serviceIds: ['srv-1','srv-4'], serviceNames: ['Corte Degradê','Sobrancelha Navalhada'], totalPrice: 60.00, totalDurationMin: 45, status: 'completed', notes: null, createdAt: '2026-07-07T14:30:00Z' },
    { id: 'apt-pend-1', companyId: 'comp-1', clientId: 'clt-5', clientName: 'Gustavo Oliveira', clientPhone: '(11) 95555-6666', date: '2026-07-14', time: '11:00', serviceIds: ['srv-1'], serviceNames: ['Corte Degradê'], totalPrice: 45.00, totalDurationMin: 30, status: 'pending', notes: 'Solicitação online. Primeira vez no agendamento automático.', createdAt: '2026-07-13T04:20:00Z' },
  ];
  for (const a of appointments) {
    await pool.query(
      `INSERT INTO appointments (id, company_id, client_id, client_name, client_phone, date, time, service_ids, service_names, total_price, total_duration_min, status, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [a.id, a.companyId, a.clientId, a.clientName, a.clientPhone, a.date, a.time, JSON.stringify(a.serviceIds), JSON.stringify(a.serviceNames), a.totalPrice, a.totalDurationMin, a.status, a.notes, a.createdAt]
    );
  }

  const transactions = [
    { id: 'tx-past-1', companyId: 'comp-1', type: 'income', amount: 70.00, description: 'Atendimento: Guilherme Souza - Combo: Corte + Barba', category: 'Atendimento', date: '2026-07-10', appointmentId: 'apt-past-1', createdAt: '2026-07-10T15:00:00Z' },
    { id: 'tx-past-2', companyId: 'comp-1', type: 'income', amount: 35.00, description: 'Atendimento: Lucas Mendes - Barba Completa', category: 'Atendimento', date: '2026-07-12', appointmentId: 'apt-past-2', createdAt: '2026-07-12T11:30:00Z' },
    { id: 'tx-past-3', companyId: 'comp-1', type: 'income', amount: 60.00, description: 'Atendimento: Arthur Lima - Corte Degradê, Sobrancelha Navalhada', category: 'Atendimento', date: '2026-07-08', appointmentId: 'apt-past-3', createdAt: '2026-07-08T11:15:00Z' },
    { id: 'tx-sale-1', companyId: 'comp-1', type: 'income', amount: 35.00, description: 'Venda de Produto: Pomada Modeladora Mate', category: 'Venda de Produto', date: '2026-07-12', appointmentId: null, createdAt: '2026-07-12T16:45:00Z' },
    { id: 'tx-sale-2', companyId: 'comp-1', type: 'income', amount: 40.00, description: 'Venda de Produto: Óleo para Barba Wood', category: 'Venda de Produto', date: '2026-07-11', appointmentId: null, createdAt: '2026-07-11T18:30:00Z' },
    { id: 'tx-exp-1', companyId: 'comp-1', type: 'expense', amount: 1200.00, description: 'Aluguel do Salão Julho/2026', category: 'Aluguel', date: '2026-07-05', appointmentId: null, createdAt: '2026-07-05T09:00:00Z' },
    { id: 'tx-exp-2', companyId: 'comp-1', type: 'expense', amount: 280.00, description: 'Conta de Energia Elétrica', category: 'Energia', date: '2026-07-07', appointmentId: null, createdAt: '2026-07-07T14:00:00Z' },
    { id: 'tx-exp-3', companyId: 'comp-1', type: 'expense', amount: 120.00, description: 'Internet Fibra 400MB', category: 'Internet', date: '2026-07-08', appointmentId: null, createdAt: '2026-07-08T10:00:00Z' },
    { id: 'tx-exp-4', companyId: 'comp-1', type: 'expense', amount: 350.00, description: 'Produtos de Limpeza e Café', category: 'Outros', date: '2026-07-11', appointmentId: null, createdAt: '2026-07-11T15:00:00Z' },
  ];
  for (const t of transactions) {
    await pool.query(
      `INSERT INTO transactions (id, company_id, type, amount, description, category, date, appointment_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [t.id, t.companyId, t.type, t.amount, t.description, t.category, t.date, t.appointmentId, t.createdAt]
    );
  }

  const sales = [
    { id: 'sale-1', companyId: 'comp-1', productId: 'prod-1', productName: 'Pomada Modeladora Mate (150g)', quantity: 1, totalPrice: 35.00, date: '2026-07-12' },
    { id: 'sale-2', companyId: 'comp-1', productId: 'prod-2', productName: 'Óleo para Barba Wood (30ml)', quantity: 1, totalPrice: 40.00, date: '2026-07-11' },
  ];
  for (const s of sales) {
    await pool.query(
      `INSERT INTO sales (id, company_id, product_id, product_name, quantity, total_price, date, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [s.id, s.companyId, s.productId, s.productName, s.quantity, s.totalPrice, s.date, now]
    );
  }

  await pool.query(
    `INSERT INTO notifications (id, company_id, type, title, message, read, appointment_id, created_at)
     VALUES ($1,$2,'pending_confirmation','Novo agendamento online',$3,false,$4,$5)`,
    ['notif-1', 'comp-1', 'Gustavo Oliveira solicitou Corte Degradê para 14/07 às 11:00.', 'apt-pend-1', '2026-07-13T04:20:00Z']
  );

  console.log('Seed concluído. Contas de demonstração:');
  console.log('  Super admin: admin@saas.com / admin123');
  console.log('  Gerente CM Studio: admin@barberflow.com / admin123');
  console.log('  Colaborador: felipe@barberflow.com / felipe123');
}

async function main() {
  await runSchema();
  await seedIfEmpty();
  await pool.end();
}

main().catch((err) => {
  console.error('Falha na migração:', err);
  process.exit(1);
});
