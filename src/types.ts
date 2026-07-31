/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Company {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address?: string;
  instagram?: string;
  logoUrl?: string;
  coverPhotoUrl?: string;
  businessType?: 'barbershop' | 'beauty_salon' | 'manicure' | 'spa' | 'other';
  primaryColor?: string; // Hex color for company branding (e.g. #ba8b3f)
  secondaryColor?: string; // Hex color
  subscriptionFee?: number; // Monthly SaaS fee paid by the company to the app owner
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'super_admin' | 'manager' | 'staff' | 'admin' | 'barber'; // 'admin' behaves as manager, 'barber' as staff
  password?: string;
  needsPasswordChange?: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  birthDate?: string;
  notes?: string;
  totalSpent: number;
  visitsCount: number;
  lastVisitAt?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  companyId: string;
  name: string;
  durationMin: number; // Duration in minutes
  price: number;
  active: boolean;
  createdAt: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string; // denormalized for quick read
  clientPhone: string; // denormalized
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  serviceIds: string[];
  serviceNames: string[]; // denormalized
  totalPrice: number;
  totalDurationMin: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface CashFlowTransaction {
  id: string;
  companyId: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string; // e.g. "Atendimento", "Aluguel", "Energia", "Venda", "Produtos"
  date: string; // YYYY-MM-DD
  appointmentId?: string; // linked if created automatically
  createdAt: string;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  price: number;
  stock: number;
  createdAt: string;
}

export interface Sale {
  id: string;
  companyId: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface CompanySettings {
  companyId: string;
  workDays: number[]; // [0, 1, 2, 3, 4, 5, 6] (0 = Sunday, 1 = Monday, etc.)
  openTime: string; // HH:MM
  closeTime: string; // HH:MM
  lunchStart?: string; // HH:MM
  lunchEnd?: string; // HH:MM
  slotIntervalMin: number; // e.g. 15, 30, 45, 60
  allowOnlineBooking: boolean;
}

export interface Notification {
  id: string;
  companyId: string;
  type: 'new_booking' | 'cancelled_booking' | 'pending_confirmation';
  title: string;
  message: string;
  read: boolean;
  appointmentId?: string;
  createdAt: string;
}
