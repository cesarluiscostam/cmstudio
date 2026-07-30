/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { Company, User } from './types';

// Import Views
import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import DashboardView from './components/DashboardView';
import AgendaView from './components/AgendaView';
import ClientesView from './components/ClientesView';
import ServicosView from './components/ServicosView';
import CaixaView from './components/CaixaView';
import TeamView from './components/TeamView';
import ConfiguracoesView from './components/ConfiguracoesView';
import PublicBookingView from './components/PublicBookingView';
import SaaSAdminView from './components/SaaSAdminView';

// Icons
import {
  LayoutDashboard,
  Calendar,
  Users,
  Briefcase,
  Wallet,
  Settings,
  LogOut,
  Bell,
  CheckCircle,
  Menu,
  X,
  WifiOff,
  User as UserIcon,
  MessageSquare,
  Globe,
  UserCog
} from 'lucide-react';

export default function App() {
  // Session State
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Routing
  const [route, setRoute] = useState<'login' | 'register' | 'backoffice' | 'public-booking'>('login');
  const [publicSlug, setPublicSlug] = useState<string>('');
  // Only true when navigating to the public booking preview from inside the backoffice —
  // a real customer opening a shared booking link has no admin panel to "go back" to.
  const [publicBookingFromBackoffice, setPublicBookingFromBackoffice] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Notifications Tray
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);

  // Mobile sidebar layout toggler
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real-time synchronization trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Quick Action Modals (Controlled globally so shortcuts work!)
  const [directOpenExpense, setDirectOpenExpense] = useState(false);

  // PWA/Network detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 1. Detect public booking URL hash on mount and changes
  // Format supported: #/agendar/slug or #/booking/slug
  const detectRoute = () => {
    const hash = window.location.hash || '';
    if (hash.includes('/agendar/') || hash.includes('/booking/')) {
      const parts = hash.split('/');
      const slug = parts[parts.length - 1];
      if (slug) {
        setPublicSlug(slug);
        setPublicBookingFromBackoffice(false);
        setRoute('public-booking');
        return;
      }
    }

    // Recover login session
    const storedUser = localStorage.getItem('bf_user');
    const storedCompany = localStorage.getItem('bf_company');
    const storedToken = localStorage.getItem('bf_token');

    if (storedUser && storedToken && storedUser !== 'undefined' && storedToken !== 'undefined') {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        if (storedCompany && storedCompany !== 'undefined' && storedCompany !== 'null') {
          setCompany(JSON.parse(storedCompany));
        } else {
          setCompany(null);
        }
        
        setToken(storedToken);
        setRoute('backoffice');
        if (parsedUser.role === 'super_admin') {
          setActiveTab('saas_dashboard');
        } else {
          setActiveTab('dashboard');
        }
      } catch (err) {
        console.error('Error parsing stored session:', err);
        setRoute('login');
      }
    } else {
      setRoute('login');
    }
  };

  useEffect(() => {
    detectRoute();
    window.addEventListener('hashchange', detectRoute);
    return () => window.removeEventListener('hashchange', detectRoute);
  }, []);

  // 2. Fetch Notifications
  const loadNotifications = async () => {
    if (route !== 'backoffice' || !user) return;
    try {
      const notifs = await api.getNotifications();
      setNotifications(notifs);
      setNotificationsCount(notifs.filter((n: any) => !n.read).length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll every 5 seconds for new online client bookings to trigger interactive notifications!
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, [route, user, refreshTrigger]);

  const handleMarkNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotificationsCount(0);
      loadNotifications();
      triggerRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSuccess = (usr: User, comp: Company) => {
    setUser(usr);
    setCompany(comp);
    setRoute('backoffice');
    if (usr.role === 'super_admin') {
      setActiveTab('saas_dashboard');
    } else {
      setActiveTab('dashboard');
    }
    triggerRefresh();
  };

  const handleCompanyUpdate = (updatedCompany: Company) => {
    setCompany(updatedCompany);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCompany(null);
    setToken(null);
    setRoute('login');
  };

  // Nav items list (Dynamic depending on role)
  const getSidebarItems = () => {
    if (user?.role === 'super_admin') {
      return [
        { id: 'saas_dashboard', label: 'Painel Master SaaS', icon: LayoutDashboard }
      ];
    }
    
    if (user?.role === 'staff') {
      return [
        { id: 'agenda', label: 'Minha Agenda', icon: Calendar },
        { id: 'clientes', label: 'Clientes', icon: Users },
        { id: 'servicos', label: 'Serviços', icon: Briefcase }
      ];
    }
    
    // manager / default admin fallback
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'agenda', label: 'Agenda', icon: Calendar },
      { id: 'clientes', label: 'Clientes', icon: Users },
      { id: 'servicos', label: 'Serviços', icon: Briefcase },
      { id: 'caixa', label: 'Fluxo de Caixa', icon: Wallet },
      { id: 'equipe', label: 'Equipe', icon: UserCog },
      { id: 'configuracoes', label: 'Configurações', icon: Settings },
    ];
  };

  const sidebarItems = getSidebarItems();

  // Helper quick shortcut actions
  const handleOpenNewAppointment = () => {
    setActiveTab('agenda');
    // We will trigger the create modal on the agenda component after tab switch
    setTimeout(() => {
      const btn = document.querySelector('[class*="Novo Horário"], [class*="Novo Agendamento"]') as HTMLButtonElement;
      if (btn) btn.click();
    }, 100);
  };

  const handleOpenNewClient = () => {
    setActiveTab('clientes');
    setTimeout(() => {
      const btn = document.querySelector('[class*="Cadastrar Cliente"]') as HTMLButtonElement;
      if (btn) btn.click();
    }, 100);
  };

  const handleOpenNewExpense = () => {
    setActiveTab('caixa');
    setDirectOpenExpense(true);
  };

  // RENDER SEPARATOR
  if (route === 'public-booking') {
    return (
      <PublicBookingView
        slug={publicSlug}
        onBackToAdmin={publicBookingFromBackoffice ? () => setRoute('backoffice') : undefined}
      />
    );
  }

  if (route === 'login') {
    return (
      <LoginView
        onSuccess={handleLoginSuccess}
        onNavigateToRegister={() => setRoute('register')}
      />
    );
  }

  if (route === 'register') {
    return (
      <RegisterView
        onSuccess={handleLoginSuccess}
        onNavigateToLogin={() => setRoute('login')}
      />
    );
  }

  // Dynamic Branding Stylesheet injection
  const brandStyle = {
    '--color-brand-primary': company?.primaryColor || '#4f46e5',
    '--color-brand-secondary': company?.secondaryColor || '#312e81',
  } as React.CSSProperties;

  // Shared notification dropdown panel — rendered from both the mobile header rail and the
  // desktop top bar bell buttons, since each only exists in one of the two layouts.
  const notificationDropdown = showNotifications && (
    <div className="absolute right-0 mt-2.5 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <span className="text-xs font-bold text-slate-900">Notificações Recentes</span>
        {notificationsCount > 0 && (
          <button
            onClick={handleMarkNotificationsRead}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-950 underline cursor-pointer"
          >
            Limpar alertas
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Nenhum alerta recente.</p>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`p-2.5 rounded-xl border text-xs text-slate-700 space-y-1 ${n.read ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 font-medium'}`}
            >
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>ONLINE REQUEST</span>
                <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="font-semibold text-slate-900 text-xs">{n.title}</p>
              <p className="text-slate-500 text-[11px] leading-tight">{n.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div style={brandStyle} className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Offline Status Warning Bar */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
          <WifiOff className="h-4 w-4" />
          <span>Você está offline. Visualizando a agenda carregada em modo leitura local.</span>
        </div>
      )}

      {/* MOBILE HEADER RAIL */}
      <div className={`md:hidden bg-brand-primary text-white p-4 flex items-center justify-between z-40 ${!isOnline ? 'mt-8' : ''}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded flex-shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-white p-1 flex items-center justify-center flex-shrink-0">
              <img src="/logo-mark.png" alt="CM Studio" className="h-full w-full object-contain" />
            </div>
          )}
          <span className="font-display font-black text-sm tracking-tight truncate">
            {user?.role === 'super_admin' ? 'Master Admin' : (company?.name || 'CM Studio')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user?.role !== 'super_admin' && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg relative transition"
              >
                <Bell className="h-4 w-4" />
                {notificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {notificationsCount}
                  </span>
                )}
              </button>
              {notificationDropdown}
            </div>
          )}
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition"
          >
            {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* BACKOFFICE SIDEBAR (Desktop & Mobile expanded) */}
      <aside
        className={`bg-white text-slate-600 border-r border-slate-200 w-full md:w-64 min-h-screen flex flex-col justify-between flex-shrink-0 z-30 transition-transform md:translate-x-0 overflow-y-auto ${mobileMenuOpen ? 'fixed inset-y-0 left-0 translate-x-0 shadow-2xl' : 'hidden md:flex'}`}
      >
        <div className="space-y-8 p-6">
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" className="h-9 w-9 object-contain rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-md">
                  <img src="/logo-mark.png" alt="CM Studio" className="h-full w-full object-contain" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-display font-black text-xs tracking-tight text-slate-900 leading-none truncate max-w-[110px]">
                  {user?.role === 'super_admin' ? 'Master Admin' : (company?.name || 'CM Studio')}
                </span>
                <span className="text-[9px] font-bold text-brand-primary tracking-wider uppercase mt-1">
                  {user?.role === 'super_admin' ? 'Plataforma SaaS' : (
                    company?.businessType === 'beauty_salon' ? 'Salão de Beleza' :
                    company?.businessType === 'manicure' ? 'Unhas & Manicure' : 'Barbearia'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Nav Items list */}
          <nav className="space-y-1 pt-4">
            {sidebarItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm font-semibold transition cursor-pointer ${isActive ? 'bg-brand-primary/10 text-brand-primary shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Direct Link to Portal do Cliente */}
            {user?.role !== 'super_admin' && (
              <button
                onClick={() => {
                  setPublicSlug(company?.slug || 'barberflow');
                  setPublicBookingFromBackoffice(true);
                  setRoute('public-booking');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm font-bold text-brand-primary hover:bg-brand-primary/5 transition cursor-pointer mt-4 border border-dashed border-brand-primary/20"
              >
                <Globe className="h-4.5 w-4.5 flex-shrink-0 text-brand-primary animate-pulse" />
                <span>Ver Página do Cliente</span>
              </button>
            )}
          </nav>
        </div>

        {/* Footer profile area & logout */}
        <div className="p-6 border-t border-slate-200 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs border border-slate-200">
              <UserIcon className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Carlos Silva'}</p>
              <p className="text-[10px] text-slate-500 font-semibold truncate uppercase">
                {user?.role === 'super_admin' ? 'SaaS Owner' : (company?.name || 'Studio')}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 py-2 px-3 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-red-50 hover:border-red-100 border border-transparent rounded-xl transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* DESKTOP TOP BAR HELPER (Visible on md+) */}
        <header className="hidden md:flex bg-white border-b border-slate-200 py-3.5 px-8 items-center justify-between z-10">
          <span className="text-xs font-bold text-brand-primary uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            {user?.role === 'super_admin' ? 'Painel de Controle Master' : `Tenant: ${company?.name || 'CM Studio'}`}
          </span>

          <div className="flex items-center gap-4">
            {/* Notification alert Bell */}
            {user?.role !== 'super_admin' && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-500 hover:text-slate-950 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {notificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-indigo-600 rounded-full animate-pulse"></span>
                  )}
                </button>
                {notificationDropdown}
              </div>
            )}

            {/* Profile Pill */}
            <div className="flex items-center gap-2.5 pl-4 border-l border-slate-200 text-sm font-semibold text-slate-800">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span>
              <span>{user?.name || 'Carlos Silva'}</span>
            </div>
          </div>
        </header>

        {/* WORKSPACE VIEWS */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          {activeTab === 'saas_dashboard' && (
            <SaaSAdminView onRefresh={triggerRefresh} refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              company={company}
              onNavigate={setActiveTab}
              onOpenNewAppointment={handleOpenNewAppointment}
              onOpenNewClient={handleOpenNewClient}
              onOpenNewExpense={handleOpenNewExpense}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activeTab === 'agenda' && (
            <AgendaView
              company={company}
              onOpenNewAppointment={handleOpenNewAppointment}
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          )}

          {activeTab === 'clientes' && (
            <ClientesView
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          )}

          {activeTab === 'servicos' && (
            <ServicosView
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          )}

          {activeTab === 'caixa' && (
            <CaixaView
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
              openNewExpenseDirect={directOpenExpense}
              onCloseExpenseDirect={() => setDirectOpenExpense(false)}
            />
          )}

          {activeTab === 'equipe' && (
            <TeamView
              currentUserId={user?.id || ''}
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
            />
          )}

          {activeTab === 'configuracoes' && (
            <ConfiguracoesView
              company={company}
              user={user}
              refreshTrigger={refreshTrigger}
              onRefresh={triggerRefresh}
              onCompanyUpdate={handleCompanyUpdate}
            />
          )}
        </div>
      </main>
    </div>
  );
}
