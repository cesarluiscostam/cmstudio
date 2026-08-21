/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { api } from './lib/api';
import { buildBrandStyle } from './lib/theme';
import { Company, User } from './types';

// Login is the very first thing anyone sees, so it stays a static import — no spinner-before-spinner.
// Every other view is only needed after auth or navigation, so each is its own chunk loaded on demand
// (this is what keeps recharts, used only by Dashboard/SaaS admin, out of the initial bundle).
import LoginView from './components/LoginView';
const RegisterView = lazy(() => import('./components/RegisterView'));
const DashboardView = lazy(() => import('./components/DashboardView'));
const AgendaView = lazy(() => import('./components/AgendaView'));
const ClientesView = lazy(() => import('./components/ClientesView'));
const ServicosView = lazy(() => import('./components/ServicosView'));
const CaixaView = lazy(() => import('./components/CaixaView'));
const TeamView = lazy(() => import('./components/TeamView'));
const ConfiguracoesView = lazy(() => import('./components/ConfiguracoesView'));
const PublicBookingView = lazy(() => import('./components/PublicBookingView'));
const SaaSAdminView = lazy(() => import('./components/SaaSAdminView'));
const TabletModeView = lazy(() => import('./components/TabletModeView'));

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
  UserCog,
  Tablet
} from 'lucide-react';

// Shared fallback for lazy-loaded views — brief enough that it barely flashes on a warm cache.
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export default function App() {
  // Session State
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Routing
  const [route, setRoute] = useState<'login' | 'register' | 'backoffice' | 'public-booking' | 'tablet-mode'>('login');
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
  // Two refs: the bell lives in different markup for mobile vs desktop headers (only one
  // is visible at a time via CSS), so outside-click detection has to check both.
  const mobileNotificationsRef = useRef<HTMLDivElement>(null);
  const desktopNotificationsRef = useRef<HTMLDivElement>(null);

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

  // Close the notifications tray on outside click or Escape, like any dropdown should.
  useEffect(() => {
    if (!showNotifications) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideMobile = mobileNotificationsRef.current?.contains(target);
      const insideDesktop = desktopNotificationsRef.current?.contains(target);
      if (!insideMobile && !insideDesktop) {
        setShowNotifications(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showNotifications]);

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
      <Suspense fallback={<PageLoader />}>
        <PublicBookingView
          slug={publicSlug}
          onBackToAdmin={publicBookingFromBackoffice ? () => setRoute('backoffice') : undefined}
        />
      </Suspense>
    );
  }

  if (route === 'tablet-mode') {
    return (
      <Suspense fallback={<PageLoader />}>
        <TabletModeView company={company} onExit={() => setRoute('backoffice')} />
      </Suspense>
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
      <Suspense fallback={<PageLoader />}>
        <RegisterView
          onSuccess={handleLoginSuccess}
          onNavigateToLogin={() => setRoute('login')}
        />
      </Suspense>
    );
  }

  // Dynamic Branding Stylesheet injection
  const brandStyle = buildBrandStyle(company);

  // Shared notification dropdown panel — rendered from both the mobile header rail and the
  // desktop top bar bell buttons, since each only exists in one of the two layouts.
  const notificationDropdown = showNotifications && (
    <div className="absolute right-0 mt-2.5 w-80 max-w-[calc(100vw-2rem)] bg-card border border-ink/10 rounded-[18px_8px_18px_8px] shadow-xl p-4 z-50 space-y-3">
      <div className="flex items-center justify-between border-b border-ink/10 pb-2">
        <span className="text-xs font-bold text-ink font-display">Notificações Recentes</span>
        {notificationsCount > 0 && (
          <button
            onClick={handleMarkNotificationsRead}
            className="text-[10px] font-bold text-ink-dim hover:text-ink underline cursor-pointer"
          >
            Limpar alertas
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-xs text-ink-dim text-center py-6">Nenhum alerta recente.</p>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`p-2.5 rounded-lg border text-xs text-ink space-y-1 ${n.read ? 'bg-card border-ink/10' : 'bg-paper border-ink/10 font-medium'}`}
            >
              <div className="flex justify-between items-center text-[10px] font-bold text-ink-dim font-mono">
                <span>ONLINE REQUEST</span>
                <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="font-semibold text-ink text-xs">{n.title}</p>
              <p className="text-ink-dim text-[11px] leading-tight">{n.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div style={brandStyle} className="min-h-screen bg-paper flex flex-col md:flex-row font-sans text-ink md:p-4 md:gap-4">

      {/* Offline Status Warning Bar */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-warn text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
          <WifiOff className="h-4 w-4" />
          <span>Você está offline. Visualizando a agenda carregada em modo leitura local.</span>
        </div>
      )}

      {/* MOBILE HEADER RAIL */}
      <div className={`md:hidden bg-rail text-paper p-4 flex items-center justify-between z-40 ${!isOnline ? 'mt-8' : ''}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-8 w-8 rounded-full border border-brass p-1.5 flex items-center justify-center flex-shrink-0">
              <img src="/logo-mark.png" alt="CM Studio" className="h-full w-full object-contain" />
            </div>
          )}
          <span className="font-display font-semibold text-base tracking-tight truncate">
            {user?.role === 'super_admin' ? 'Master Admin' : (company?.name || 'CM Studio')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user?.role !== 'super_admin' && (
            <div className="relative" ref={mobileNotificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg relative transition"
              >
                <Bell className="h-4 w-4" />
                {notificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-wine text-paper text-[9px] font-bold rounded-full flex items-center justify-center">
                    {notificationsCount}
                  </span>
                )}
              </button>
              {notificationDropdown}
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition"
          >
            {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu backdrop — tap outside the sidebar to close it */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-20"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* BACKOFFICE SIDEBAR (Desktop & Mobile expanded) */}
      <aside
        className={`bg-rail text-paper/80 w-full md:w-64 min-h-screen md:min-h-0 flex flex-col justify-between flex-shrink-0 z-30 transition-transform md:translate-x-0 overflow-y-auto md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:rounded-[22px_8px_22px_8px] md:shadow-[0_16px_34px_-18px_rgba(24,40,33,0.55)] ${mobileMenuOpen ? 'fixed inset-y-0 left-0 translate-x-0 shadow-2xl' : 'hidden md:flex'}`}
      >
        <div className="space-y-8 p-6">
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" className="h-9 w-9 object-contain rounded-full border border-brass-soft" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-9 w-9 rounded-full border border-brass p-1.5 flex items-center justify-center flex-shrink-0">
                  <img src="/logo-mark.png" alt="CM Studio" className="h-full w-full object-contain" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-display font-semibold text-sm tracking-tight text-paper leading-none truncate max-w-[110px]">
                  {user?.role === 'super_admin' ? 'Master Admin' : (company?.name || 'CM Studio')}
                </span>
                <span className="text-[9px] font-bold text-brass tracking-wider uppercase mt-1.5 font-mono">
                  {user?.role === 'super_admin' ? 'Plataforma SaaS' : (
                    company?.businessType === 'beauty_salon' ? 'Salão de Beleza' :
                    company?.businessType === 'manicure' ? 'Unhas & Manicure' : 'Barbearia'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Nav Items list */}
          <nav className="space-y-1 pt-4 border-t border-brass-soft">
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
                  className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-lg text-sm font-semibold transition cursor-pointer mt-3 ${isActive ? 'bg-brand-primary/15 text-brand-primary font-bold border-l-2 border-brand-primary' : 'text-paper/70 hover:bg-white/5 hover:text-paper border-l-2 border-transparent'}`}
                >
                  <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Kiosk view for a counter tablet: next appointments + one-tap confirm/decline */}
            {user?.role !== 'super_admin' && (
              <button
                onClick={() => {
                  setRoute('tablet-mode');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 py-2.5 px-4 rounded-lg text-sm font-bold text-brass hover:bg-white/5 transition cursor-pointer mt-4 border border-dashed border-brass-soft"
              >
                <Tablet className="h-4.5 w-4.5 flex-shrink-0 text-brass" />
                <span>Modo Tablet</span>
              </button>
            )}

            {/* Direct Link to Portal do Cliente */}
            {user?.role !== 'super_admin' && (
              <button
                onClick={() => {
                  setPublicSlug(company?.slug || 'barberflow');
                  setPublicBookingFromBackoffice(true);
                  setRoute('public-booking');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 py-2.5 px-4 rounded-lg text-sm font-bold text-brass hover:bg-white/5 transition cursor-pointer mt-2 border border-dashed border-brass-soft"
              >
                <Globe className="h-4.5 w-4.5 flex-shrink-0 text-brass" />
                <span>Ver Página do Cliente</span>
              </button>
            )}
          </nav>
        </div>

        {/* Footer profile area & logout */}
        <div className="p-6 border-t border-brass-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center text-paper font-bold text-xs border border-brass-soft">
              <UserIcon className="h-4 w-4 text-brass" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-paper truncate">{user?.name || 'Carlos Silva'}</p>
              <p className="text-[10px] text-paper/50 font-semibold truncate uppercase font-mono">
                {user?.role === 'super_admin' ? 'SaaS Owner' : (company?.name || 'Studio')}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 py-2 px-3 text-xs font-semibold text-paper/70 hover:text-paper bg-white/5 hover:bg-wine/40 border border-transparent rounded-lg transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* DESKTOP TOP BAR HELPER (Visible on md+) */}
        <header className="hidden md:flex bg-paper border-b border-ink/10 py-3.5 px-8 items-center justify-between z-10">
          <span className="text-xs font-bold text-ink-dim uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <CheckCircle className="h-3.5 w-3.5 text-ok" />
            {user?.role === 'super_admin' ? 'Painel de Controle Master' : (company?.name || 'CM Studio')}
          </span>

          <div className="flex items-center gap-4">
            {/* Notification alert Bell */}
            {user?.role !== 'super_admin' && (
              <div className="relative" ref={desktopNotificationsRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-ink-dim hover:text-ink hover:bg-card rounded-lg transition cursor-pointer"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {notificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-wine rounded-full animate-pulse"></span>
                  )}
                </button>
                {notificationDropdown}
              </div>
            )}

            {/* Profile Pill */}
            <div className="flex items-center gap-2.5 pl-4 border-l border-ink/10 text-sm font-semibold text-ink">
              <span className="h-1.5 w-1.5 bg-ok rounded-full"></span>
              <span>{user?.name || 'Carlos Silva'}</span>
            </div>
          </div>
        </header>

        {/* WORKSPACE VIEWS */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
        <Suspense fallback={<PageLoader />}>
          {activeTab === 'saas_dashboard' && (
            <SaaSAdminView onRefresh={triggerRefresh} refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              company={company}
              user={user}
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
              user={user}
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
        </Suspense>
        </div>
      </main>
    </div>
  );
}
