/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from './pool';
import {
  Company,
  User,
  Client,
  Service,
  Appointment,
  CashFlowTransaction,
  Product,
  Sale,
  CompanySettings,
  Notification
} from '../src/types';

// ---- Row <-> domain object mappers (DB is snake_case, app is camelCase) ----

function mapCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    phone: row.phone,
    address: row.address ?? undefined,
    instagram: row.instagram ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    coverPhotoUrl: row.cover_photo_url ?? undefined,
    businessType: row.business_type ?? undefined,
    primaryColor: row.primary_color ?? undefined,
    secondaryColor: row.secondary_color ?? undefined,
    subscriptionFee: row.subscription_fee !== null ? Number(row.subscription_fee) : undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

// `password` carries the bcrypt hash internally. Never send this object to a client as-is;
// use sanitizeUser() at the API boundary.
function mapUser(row: any): User {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    role: row.role,
    password: row.password_hash,
    needsPasswordChange: row.needs_password_change,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function mapSettings(row: any): CompanySettings {
  return {
    companyId: row.company_id,
    workDays: row.work_days,
    openTime: row.open_time,
    closeTime: row.close_time,
    lunchStart: row.lunch_start ?? undefined,
    lunchEnd: row.lunch_end ?? undefined,
    slotIntervalMin: row.slot_interval_min,
    allowOnlineBooking: row.allow_online_booking,
  };
}

function mapService(row: any): Service {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    durationMin: row.duration_min,
    price: Number(row.price),
    active: row.active,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function mapClient(row: any): Client {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    phone: row.phone,
    birthDate: row.birth_date ?? undefined,
    notes: row.notes ?? undefined,
    totalSpent: Number(row.total_spent),
    visitsCount: row.visits_count,
    lastVisitAt: row.last_visit_at ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function mapAppointment(row: any): Appointment {
  return {
    id: row.id,
    companyId: row.company_id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    date: row.date,
    time: row.time,
    serviceIds: row.service_ids,
    serviceNames: row.service_names,
    totalPrice: Number(row.total_price),
    totalDurationMin: row.total_duration_min,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function mapTransaction(row: any): CashFlowTransaction {
  return {
    id: row.id,
    companyId: row.company_id,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    category: row.category,
    date: row.date,
    appointmentId: row.appointment_id ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function mapProduct(row: any): Product {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    price: Number(row.price),
    stock: row.stock,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function mapSale(row: any): Sale {
  return {
    id: row.id,
    companyId: row.company_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    totalPrice: Number(row.total_price),
    date: row.date,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    companyId: row.company_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    appointmentId: row.appointment_id ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

export const dbOperations = {
  // Companies
  getCompanies: async (): Promise<Company[]> => {
    const { rows } = await pool.query('SELECT * FROM companies ORDER BY created_at ASC');
    return rows.map(mapCompany);
  },
  getCompanyBySlug: async (slug: string): Promise<Company | null> => {
    const { rows } = await pool.query('SELECT * FROM companies WHERE slug = $1', [slug]);
    return rows[0] ? mapCompany(rows[0]) : null;
  },
  getCompanyById: async (id: string): Promise<Company | null> => {
    const { rows } = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    return rows[0] ? mapCompany(rows[0]) : null;
  },
  createCompany: async (company: Company): Promise<Company> => {
    await pool.query(
      `INSERT INTO companies (id, name, slug, phone, address, instagram, logo_url, cover_photo_url, business_type, primary_color, secondary_color, subscription_fee, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [company.id, company.name, company.slug, company.phone, company.address ?? null, company.instagram ?? null,
       company.logoUrl ?? null, company.coverPhotoUrl ?? null, company.businessType ?? null, company.primaryColor ?? null, company.secondaryColor ?? null,
       company.subscriptionFee ?? null, company.createdAt]
    );
    return company;
  },
  updateCompany: async (id: string, updated: Partial<Company>): Promise<Company | null> => {
    const existing = await dbOperations.getCompanyById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updated };
    await pool.query(
      `UPDATE companies SET name=$2, slug=$3, phone=$4, address=$5, instagram=$6, logo_url=$7, cover_photo_url=$8, business_type=$9, primary_color=$10, secondary_color=$11, subscription_fee=$12 WHERE id=$1`,
      [id, merged.name, merged.slug, merged.phone, merged.address ?? null, merged.instagram ?? null,
       merged.logoUrl ?? null, merged.coverPhotoUrl ?? null, merged.businessType ?? null, merged.primaryColor ?? null, merged.secondaryColor ?? null,
       merged.subscriptionFee ?? null]
    );
    return dbOperations.getCompanyById(id);
  },
  deleteCompany: async (id: string): Promise<boolean> => {
    // ON DELETE CASCADE isn't set up (ids aren't FKs across tables historically), so clean up explicitly.
    await pool.query('DELETE FROM users WHERE company_id = $1', [id]);
    await pool.query('DELETE FROM services WHERE company_id = $1', [id]);
    await pool.query('DELETE FROM appointments WHERE company_id = $1', [id]);
    await pool.query('DELETE FROM products WHERE company_id = $1', [id]);
    await pool.query('DELETE FROM sales WHERE company_id = $1', [id]);
    await pool.query('DELETE FROM transactions WHERE company_id = $1', [id]);
    await pool.query('DELETE FROM settings WHERE company_id = $1', [id]);
    await pool.query('DELETE FROM notifications WHERE company_id = $1', [id]);
    await pool.query('DELETE FROM companies WHERE id = $1', [id]);
    return true;
  },

  // Users
  getUsers: async (companyId: string): Promise<User[]> => {
    const { rows } = await pool.query('SELECT * FROM users WHERE company_id = $1', [companyId]);
    return rows.map(mapUser);
  },
  getUserByEmail: async (email: string): Promise<User | null> => {
    const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
    return rows[0] ? mapUser(rows[0]) : null;
  },
  getUserById: async (id: string): Promise<User | null> => {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? mapUser(rows[0]) : null;
  },
  createUser: async (user: User): Promise<User> => {
    await pool.query(
      `INSERT INTO users (id, company_id, name, email, phone, role, password_hash, needs_password_change, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [user.id, user.companyId, user.name, user.email, user.phone ?? null, user.role,
       user.password, user.needsPasswordChange ?? false, user.createdAt]
    );
    return user;
  },
  updateUser: async (id: string, updated: Partial<User>): Promise<User | null> => {
    const existing = await dbOperations.getUserById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updated };
    await pool.query(
      `UPDATE users SET name=$2, email=$3, phone=$4, role=$5, password_hash=$6, needs_password_change=$7 WHERE id=$1`,
      [id, merged.name, merged.email, merged.phone ?? null, merged.role, merged.password, merged.needsPasswordChange ?? false]
    );
    return dbOperations.getUserById(id);
  },

  // Settings
  getSettings: async (companyId: string): Promise<CompanySettings | null> => {
    const { rows } = await pool.query('SELECT * FROM settings WHERE company_id = $1', [companyId]);
    return rows[0] ? mapSettings(rows[0]) : null;
  },
  updateSettings: async (companyId: string, updated: Partial<CompanySettings>): Promise<CompanySettings | null> => {
    const existing = await dbOperations.getSettings(companyId);
    const merged: CompanySettings = {
      companyId,
      workDays: [1, 2, 3, 4, 5, 6],
      openTime: '09:00',
      closeTime: '19:00',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      slotIntervalMin: 30,
      allowOnlineBooking: true,
      ...existing,
      ...updated,
    };
    await pool.query(
      `INSERT INTO settings (company_id, work_days, open_time, close_time, lunch_start, lunch_end, slot_interval_min, allow_online_booking)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (company_id) DO UPDATE SET
         work_days=$2, open_time=$3, close_time=$4, lunch_start=$5, lunch_end=$6, slot_interval_min=$7, allow_online_booking=$8`,
      [companyId, JSON.stringify(merged.workDays), merged.openTime, merged.closeTime,
       merged.lunchStart ?? null, merged.lunchEnd ?? null, merged.slotIntervalMin, merged.allowOnlineBooking]
    );
    return dbOperations.getSettings(companyId);
  },

  // Services
  getServices: async (companyId: string): Promise<Service[]> => {
    const { rows } = await pool.query('SELECT * FROM services WHERE company_id = $1 ORDER BY created_at ASC', [companyId]);
    return rows.map(mapService);
  },
  getServiceById: async (id: string): Promise<Service | null> => {
    const { rows } = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    return rows[0] ? mapService(rows[0]) : null;
  },
  createService: async (service: Service): Promise<Service> => {
    await pool.query(
      `INSERT INTO services (id, company_id, name, duration_min, price, active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [service.id, service.companyId, service.name, service.durationMin, service.price, service.active, service.createdAt]
    );
    return service;
  },
  updateService: async (id: string, updated: Partial<Service>): Promise<Service | null> => {
    const existing = await dbOperations.getServiceById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updated };
    await pool.query(
      `UPDATE services SET name=$2, duration_min=$3, price=$4, active=$5 WHERE id=$1`,
      [id, merged.name, merged.durationMin, merged.price, merged.active]
    );
    return dbOperations.getServiceById(id);
  },
  deleteService: async (id: string): Promise<boolean> => {
    await pool.query('DELETE FROM services WHERE id = $1', [id]);
    return true;
  },

  // Clients
  getClients: async (companyId: string): Promise<Client[]> => {
    const { rows } = await pool.query('SELECT * FROM clients WHERE company_id = $1 ORDER BY created_at ASC', [companyId]);
    return rows.map(mapClient);
  },
  getClientById: async (id: string): Promise<Client | null> => {
    const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    return rows[0] ? mapClient(rows[0]) : null;
  },
  createClient: async (client: Client): Promise<Client> => {
    await pool.query(
      `INSERT INTO clients (id, company_id, name, phone, birth_date, notes, total_spent, visits_count, last_visit_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [client.id, client.companyId, client.name, client.phone, client.birthDate ?? null, client.notes ?? null,
       client.totalSpent, client.visitsCount, client.lastVisitAt ?? null, client.createdAt]
    );
    return client;
  },
  updateClient: async (id: string, updated: Partial<Client>): Promise<Client | null> => {
    const existing = await dbOperations.getClientById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updated };
    await pool.query(
      `UPDATE clients SET name=$2, phone=$3, birth_date=$4, notes=$5, total_spent=$6, visits_count=$7, last_visit_at=$8 WHERE id=$1`,
      [id, merged.name, merged.phone, merged.birthDate ?? null, merged.notes ?? null,
       merged.totalSpent, merged.visitsCount, merged.lastVisitAt ?? null]
    );
    return dbOperations.getClientById(id);
  },

  // Products
  getProducts: async (companyId: string): Promise<Product[]> => {
    const { rows } = await pool.query('SELECT * FROM products WHERE company_id = $1 ORDER BY created_at ASC', [companyId]);
    return rows.map(mapProduct);
  },
  getProductById: async (id: string): Promise<Product | null> => {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return rows[0] ? mapProduct(rows[0]) : null;
  },
  createProduct: async (product: Product): Promise<Product> => {
    await pool.query(
      `INSERT INTO products (id, company_id, name, price, stock, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [product.id, product.companyId, product.name, product.price, product.stock, product.createdAt]
    );
    return product;
  },
  updateProduct: async (id: string, updated: Partial<Product>): Promise<Product | null> => {
    const existing = await dbOperations.getProductById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updated };
    await pool.query(`UPDATE products SET name=$2, price=$3, stock=$4 WHERE id=$1`, [id, merged.name, merged.price, merged.stock]);
    return dbOperations.getProductById(id);
  },

  // Sales
  getSales: async (companyId: string): Promise<Sale[]> => {
    const { rows } = await pool.query('SELECT * FROM sales WHERE company_id = $1 ORDER BY created_at ASC', [companyId]);
    return rows.map(mapSale);
  },
  createSale: async (sale: Sale): Promise<Sale> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO sales (id, company_id, product_id, product_name, quantity, total_price, date, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [sale.id, sale.companyId, sale.productId, sale.productName, sale.quantity, sale.totalPrice, sale.date, sale.createdAt]
      );
      await client.query('UPDATE products SET stock = GREATEST(0, stock - $2) WHERE id = $1', [sale.productId, sale.quantity]);
      const txId = `tx-sale-${Date.now()}`;
      await client.query(
        `INSERT INTO transactions (id, company_id, type, amount, description, category, date, created_at)
         VALUES ($1,$2,'income',$3,$4,'Venda de Produto',$5,$6)`,
        [txId, sale.companyId, sale.totalPrice, `Venda de Produto: ${sale.productName} (x${sale.quantity})`, sale.date, new Date().toISOString()]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return sale;
  },

  // Appointments
  getAppointments: async (companyId: string): Promise<Appointment[]> => {
    const { rows } = await pool.query('SELECT * FROM appointments WHERE company_id = $1 ORDER BY date ASC, time ASC', [companyId]);
    return rows.map(mapAppointment);
  },
  getAppointmentById: async (id: string): Promise<Appointment | null> => {
    const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    return rows[0] ? mapAppointment(rows[0]) : null;
  },
  createAppointment: async (apt: Appointment): Promise<Appointment> => {
    await pool.query(
      `INSERT INTO appointments (id, company_id, client_id, client_name, client_phone, date, time, service_ids, service_names, total_price, total_duration_min, status, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [apt.id, apt.companyId, apt.clientId, apt.clientName, apt.clientPhone, apt.date, apt.time,
       JSON.stringify(apt.serviceIds), JSON.stringify(apt.serviceNames), apt.totalPrice, apt.totalDurationMin,
       apt.status, apt.notes ?? null, apt.createdAt]
    );

    if (apt.status === 'pending') {
      await pool.query(
        `INSERT INTO notifications (id, company_id, type, title, message, read, appointment_id, created_at)
         VALUES ($1,$2,'pending_confirmation','Novo agendamento online',$3,false,$4,$5)`,
        [`notif-${Date.now()}`, apt.companyId, `${apt.clientName} solicitou ${apt.serviceNames.join(', ')} para ${apt.date} às ${apt.time}.`,
         apt.id, new Date().toISOString()]
      );
    }

    return apt;
  },
  updateAppointment: async (id: string, updated: Partial<Appointment>): Promise<Appointment | null> => {
    const oldApt = await dbOperations.getAppointmentById(id);
    if (!oldApt) return null;
    const newApt = { ...oldApt, ...updated };

    await pool.query(
      `UPDATE appointments SET client_id=$2, client_name=$3, client_phone=$4, date=$5, time=$6, service_ids=$7, service_names=$8,
         total_price=$9, total_duration_min=$10, status=$11, notes=$12 WHERE id=$1`,
      [id, newApt.clientId, newApt.clientName, newApt.clientPhone, newApt.date, newApt.time,
       JSON.stringify(newApt.serviceIds), JSON.stringify(newApt.serviceNames), newApt.totalPrice,
       newApt.totalDurationMin, newApt.status, newApt.notes ?? null]
    );

    if (oldApt.status !== 'completed' && newApt.status === 'completed') {
      await pool.query(
        `INSERT INTO transactions (id, company_id, type, amount, description, category, date, appointment_id, created_at)
         VALUES ($1,$2,'income',$3,$4,'Atendimento',$5,$6,$7)`,
        [`tx-apt-${Date.now()}`, newApt.companyId, newApt.totalPrice,
         `Atendimento: ${newApt.clientName} - ${newApt.serviceNames.join(', ')}`, newApt.date, newApt.id, new Date().toISOString()]
      );
      await pool.query(
        `UPDATE clients SET total_spent = total_spent + $2, visits_count = visits_count + 1, last_visit_at = $3 WHERE id = $1`,
        [newApt.clientId, newApt.totalPrice, new Date().toISOString()]
      );
    }

    if (oldApt.status === 'pending' && newApt.status === 'confirmed') {
      await pool.query(
        `INSERT INTO notifications (id, company_id, type, title, message, read, appointment_id, created_at)
         VALUES ($1,$2,'new_booking','Agendamento Confirmado',$3,false,$4,$5)`,
        [`notif-${Date.now()}`, newApt.companyId,
         `Agendamento de ${newApt.clientName} para ${newApt.date} às ${newApt.time} foi confirmado!`, newApt.id, new Date().toISOString()]
      );
    }

    return dbOperations.getAppointmentById(id);
  },
  deleteAppointment: async (id: string): Promise<boolean> => {
    await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
    return true;
  },

  // Transactions / Cash Flow
  getTransactions: async (companyId: string): Promise<CashFlowTransaction[]> => {
    const { rows } = await pool.query('SELECT * FROM transactions WHERE company_id = $1 ORDER BY date ASC', [companyId]);
    return rows.map(mapTransaction);
  },
  createTransaction: async (tx: CashFlowTransaction): Promise<CashFlowTransaction> => {
    await pool.query(
      `INSERT INTO transactions (id, company_id, type, amount, description, category, date, appointment_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [tx.id, tx.companyId, tx.type, tx.amount, tx.description, tx.category, tx.date, tx.appointmentId ?? null, tx.createdAt]
    );
    return tx;
  },
  deleteTransaction: async (id: string): Promise<boolean> => {
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    return true;
  },

  // Notifications
  getNotifications: async (companyId: string): Promise<Notification[]> => {
    const { rows } = await pool.query('SELECT * FROM notifications WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    return rows.map(mapNotification);
  },
  markAllNotificationsRead: async (companyId: string): Promise<boolean> => {
    await pool.query('UPDATE notifications SET read = true WHERE company_id = $1', [companyId]);
    return true;
  }
};
