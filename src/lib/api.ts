/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple client-side API helper
const API_BASE = '/api';

export function getAuthHeaders() {
  const company = localStorage.getItem('bf_company');
  const user = localStorage.getItem('bf_user');
  const token = localStorage.getItem('bf_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (company && company !== 'undefined' && company !== 'null') {
    try {
      const parsedCompany = JSON.parse(company);
      if (parsedCompany && parsedCompany.id) {
        headers['x-company-id'] = parsedCompany.id;
      }
    } catch (e) {
      console.error('Error parsing company from localStorage:', e);
    }
  }
  if (user && user !== 'undefined' && user !== 'null') {
    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser && parsedUser.id) {
        headers['x-user-id'] = parsedUser.id;
      }
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export const api = {
  // Public Client Area
  getPublicCompany: async (slug: string) => {
    const res = await fetch(`${API_BASE}/public/company/${slug}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao carregar barbearia');
    }
    return res.json();
  },

  getPublicAvailability: async (slug: string, date: string, durationMin?: number) => {
    const params = new URLSearchParams({ date });
    if (durationMin) params.set('durationMin', String(durationMin));
    const res = await fetch(`${API_BASE}/public/company/${slug}/availability?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Erro ao carregar horários disponíveis');
    }
    return res.json();
  },

  createPublicBooking: async (bookingData: {
    companyId: string;
    name: string;
    phone: string;
    date: string;
    time: string;
    serviceIds: string[];
    notes?: string;
  }) => {
    const res = await fetch(`${API_BASE}/public/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao realizar agendamento');
    }
    return res.json();
  },

  // Auth
  login: async (credentials: { email: string; password?: string }) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'E-mail ou senha incorretos.');
    }
    const data = await res.json();
    if (data.user) localStorage.setItem('bf_user', JSON.stringify(data.user));
    else localStorage.removeItem('bf_user');

    if (data.company) localStorage.setItem('bf_company', JSON.stringify(data.company));
    else localStorage.removeItem('bf_company');

    if (data.settings) localStorage.setItem('bf_settings', JSON.stringify(data.settings));
    else localStorage.removeItem('bf_settings');

    if (data.token) localStorage.setItem('bf_token', data.token);
    else localStorage.removeItem('bf_token');
    return data;
  },

  changePassword: async (payload: { email: string; password?: string; newPassword: string }) => {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao alterar a senha.');
    }
    const data = await res.json();
    if (data.user) localStorage.setItem('bf_user', JSON.stringify(data.user));
    return data;
  },

  register: async (regData: {
    name: string;
    companyName: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao cadastrar barbearia.');
    }
    const data = await res.json();
    if (data.user) localStorage.setItem('bf_user', JSON.stringify(data.user));
    else localStorage.removeItem('bf_user');

    if (data.company) localStorage.setItem('bf_company', JSON.stringify(data.company));
    else localStorage.removeItem('bf_company');

    if (data.settings) localStorage.setItem('bf_settings', JSON.stringify(data.settings));
    else localStorage.removeItem('bf_settings');

    if (data.token) localStorage.setItem('bf_token', data.token);
    else localStorage.removeItem('bf_token');
    return data;
  },

  logout: () => {
    localStorage.removeItem('bf_user');
    localStorage.removeItem('bf_company');
    localStorage.removeItem('bf_settings');
    localStorage.removeItem('bf_token');
  },

  // Dashboard stats
  getDashboardStats: async () => {
    const res = await fetch(`${API_BASE}/dashboard-stats`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao carregar dados do dashboard');
    return res.json();
  },

  // Appointments
  getAppointments: async () => {
    const res = await fetch(`${API_BASE}/appointments`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao carregar agendamentos');
    return res.json();
  },

  createAppointment: async (aptData: any) => {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(aptData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar agendamento');
    }
    return res.json();
  },

  updateAppointment: async (id: string, updated: any) => {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao atualizar agendamento');
    }
    return res.json();
  },

  deleteAppointment: async (id: string) => {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao excluir agendamento');
    return res.json();
  },

  // Clients
  getClients: async () => {
    const res = await fetch(`${API_BASE}/clients`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao carregar clientes');
    return res.json();
  },

  createClient: async (clientData: any) => {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(clientData),
    });
    if (!res.ok) throw new Error('Erro ao cadastrar cliente');
    return res.json();
  },

  updateClient: async (id: string, updated: any) => {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error('Erro ao atualizar cliente');
    return res.json();
  },

  deleteClient: async (id: string) => {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao excluir cliente');
    return res.json();
  },

  // Services
  getServices: async () => {
    const res = await fetch(`${API_BASE}/services`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao carregar serviços');
    return res.json();
  },

  createService: async (srvData: any) => {
    const res = await fetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(srvData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar serviço');
    }
    return res.json();
  },

  updateService: async (id: string, updated: any) => {
    const res = await fetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error('Erro ao atualizar serviço');
    return res.json();
  },

  deleteService: async (id: string) => {
    const res = await fetch(`${API_BASE}/services/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao excluir serviço');
    return res.json();
  },

  // Cash Flow
  getCashFlow: async () => {
    const res = await fetch(`${API_BASE}/cash-flow`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao carregar fluxo de caixa');
    return res.json();
  },

  createTransaction: async (txData: any) => {
    const res = await fetch(`${API_BASE}/cash-flow`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(txData),
    });
    if (!res.ok) throw new Error('Erro ao registrar transação');
    return res.json();
  },

  deleteTransaction: async (id: string) => {
    const res = await fetch(`${API_BASE}/cash-flow/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao remover transação');
    return res.json();
  },

  // Products & Sales
  getProducts: async () => {
    const res = await fetch(`${API_BASE}/products`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao carregar produtos');
    return res.json();
  },

  createProduct: async (prodData: any) => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(prodData),
    });
    if (!res.ok) throw new Error('Erro ao cadastrar produto');
    return res.json();
  },

  updateProduct: async (id: string, updated: any) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error('Erro ao atualizar produto');
    return res.json();
  },

  deleteProduct: async (id: string) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao excluir produto');
    return res.json();
  },

  createSale: async (saleData: any) => {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(saleData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao registrar venda');
    }
    return res.json();
  },

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao carregar configurações');
    return res.json();
  },

  updateSettings: async (settingsData: any) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settingsData),
    });
    if (!res.ok) throw new Error('Erro ao atualizar configurações');
    return res.json();
  },

  // Notifications
  getNotifications: async () => {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao carregar notificações');
    return res.json();
  },

  markAllNotificationsRead: async () => {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao limpar notificações');
    return res.json();
  },

  // SaaS Super Admin
  getSaaSDashboard: async () => {
    const res = await fetch(`${API_BASE}/saas/dashboard`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao buscar painel SaaS');
    return res.json();
  },

  createSaaSCompany: async (data: any) => {
    const res = await fetch(`${API_BASE}/saas/companies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar empresa parceira');
    }
    return res.json();
  },

  updateSaaSCompany: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/saas/companies/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao atualizar empresa parceira');
    }
    return res.json();
  },

  deleteSaaSCompany: async (id: string) => {
    const res = await fetch(`${API_BASE}/saas/companies/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao remover empresa parceira');
    }
    return res.json();
  },

  resetUserPassword: async (userId: string) => {
    const res = await fetch(`${API_BASE}/saas/users/${userId}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao redefinir senha do usuário');
    }
    return res.json();
  },

  // Team (staff management)
  getTeam: async () => {
    const res = await fetch(`${API_BASE}/team`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao carregar equipe');
    return res.json();
  },

  createTeamMember: async (data: any) => {
    const res = await fetch(`${API_BASE}/team`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao adicionar membro da equipe');
    }
    return res.json();
  },

  updateTeamMember: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/team/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao atualizar membro da equipe');
    }
    return res.json();
  },

  deleteTeamMember: async (id: string) => {
    const res = await fetch(`${API_BASE}/team/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao remover membro da equipe');
    }
    return res.json();
  },

  uploadCompanyLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const token = localStorage.getItem('bf_token');
    const res = await fetch(`${API_BASE}/company/logo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao enviar a imagem.');
    }
    return res.json();
  },

  uploadCompanyCoverPhoto: async (file: File) => {
    const formData = new FormData();
    formData.append('coverPhoto', file);
    const token = localStorage.getItem('bf_token');
    const res = await fetch(`${API_BASE}/company/cover-photo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao enviar a imagem.');
    }
    return res.json();
  },

  // Manager settings customization
  updateCompanyProfile: async (profileData: any) => {
    const res = await fetch(`${API_BASE}/company/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao atualizar dados da empresa');
    }
    const data = await res.json();
    // Update local storage representation so the UI updates live
    localStorage.setItem('bf_company', JSON.stringify(data));
    return data;
  },
};
