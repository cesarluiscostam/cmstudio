/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { getTodayStr } from '../lib/date';
import { formatPhoneBR } from '../lib/phone';
import { useToast } from '../lib/ui';
import { Service, Company, CompanySettings } from '../types';
import {
  Clock,
  Calendar,
  User,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Users,
  X,
  ShieldCheck,
  CalendarX
} from 'lucide-react';

interface PublicStaff {
  id: string;
  name: string;
}

interface PublicBookingViewProps {
  slug: string;
  onBackToAdmin?: () => void;
}

export default function PublicBookingView({ slug, onBackToAdmin }: PublicBookingViewProps) {
  const showToast = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [staffList, setStaffList] = useState<PublicStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 'booking' is the normal reserve-a-slot wizard; 'manage' lets an existing customer look up and
  // cancel their own upcoming appointments by phone, without any account/login.
  const [viewMode, setViewMode] = useState<'booking' | 'manage'>('booking');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Step tracker
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Services, 2: Date & Time, 3: Contact & Confirm
  const [success, setSuccess] = useState(false);
  const [successApt, setSuccessApt] = useState<any>(null);

  // Scheduling selections
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getTodayStr(tomorrow);
  });
  const [selectedTime, setSelectedTime] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsUnavailableReason, setSlotsUnavailableReason] = useState<'closed' | 'booking_disabled' | null>(null);

  // Customer credentials
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Available slots for selected date
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // "Manage my bookings" lookup
  const [managePhone, setManagePhone] = useState('');
  const [manageLoading, setManageLoading] = useState(false);
  const [manageSearched, setManageSearched] = useState(false);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const renderAdminBar = () => {
    if (!onBackToAdmin) return null;
    return (
      <div className="bg-rail text-paper px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold shadow-md border-b border-brass-soft shrink-0 w-full">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brass animate-pulse"></span>
          <span>Modo de Visualização: Portal do Cliente (Agendamento Online)</span>
        </div>
        <button
          type="button"
          onClick={onBackToAdmin}
          className="px-4 py-1.5 bg-brand-primary hover:opacity-90 text-white font-bold rounded-lg transition cursor-pointer text-xs flex items-center gap-1.5 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Painel do Barbeiro
        </button>
      </div>
    );
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await api.getPublicCompany(slug);
        setCompany(data.company);
        setServices(data.services);
        setSettings(data.settings);
        setStaffList(data.staff || []);
      } catch (err: any) {
        setError(err.message || 'Barbearia não encontrada.');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [slug]);

  // Fetch real available slots (already-booked times excluded) whenever the date or chosen services change.
  useEffect(() => {
    if (!settings || !company || selectedServices.length === 0) {
      setAvailableSlots([]);
      setSlotsUnavailableReason(null);
      return;
    }

    const durationForSelection = services
      .filter(s => selectedServices.includes(s.id))
      .reduce((sum, s) => sum + s.durationMin, 0);

    let cancelled = false;
    const loadAvailability = async () => {
      try {
        setSlotsLoading(true);
        const data = await api.getPublicAvailability(company.slug, selectedDate, durationForSelection, selectedStaffId || undefined);
        if (cancelled) return;
        setAvailableSlots(data.slots || []);
        setSlotsUnavailableReason(data.reason || null);
        setSelectedTime('');
      } catch (err) {
        if (!cancelled) {
          setAvailableSlots([]);
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    };
    loadAvailability();

    return () => { cancelled = true; };
  }, [selectedDate, settings, company, services, selectedServices, selectedStaffId]);

  const handleToggleService = (srvId: string) => {
    if (selectedServices.includes(srvId)) {
      setSelectedServices(selectedServices.filter(id => id !== srvId));
    } else {
      setSelectedServices([...selectedServices, srvId]);
    }
  };

  const handleStep1Submit = () => {
    if (selectedServices.length === 0) {
      showToast('Selecione pelo menos um serviço para continuar.', 'error');
      return;
    }
    setStep(2);
  };

  const handleStep2Submit = () => {
    if (!selectedTime) {
      showToast('Selecione um horário disponível.', 'error');
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      showToast('Por favor, preencha seu nome e celular de contato.', 'error');
      return;
    }
    if (!privacyConsent) {
      showToast('É necessário concordar com o uso dos seus dados para agendar.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const data = await api.createPublicBooking({
        companyId: company!.id,
        name: customerName,
        phone: customerPhone,
        date: selectedDate,
        time: selectedTime,
        serviceIds: selectedServices,
        notes: customerNotes,
        staffId: selectedStaffId || undefined
      });
      setSuccessApt(data.appointment);
      setSuccess(true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao realizar agendamento.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStaffName = staffList.find(s => s.id === selectedStaffId)?.name;

  const handleSearchMyAppointments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managePhone.replace(/\D/g, '')) {
      showToast('Informe o telefone usado no agendamento.', 'error');
      return;
    }
    try {
      setManageLoading(true);
      setManageSearched(true);
      const data = await api.getMyPublicAppointments(slug, managePhone);
      setMyAppointments(data.appointments || []);
    } catch (err: any) {
      showToast(err.message || 'Erro ao buscar agendamentos.', 'error');
    } finally {
      setManageLoading(false);
    }
  };

  const handleCancelMyAppointment = async (id: string) => {
    try {
      setCancellingId(id);
      await api.cancelPublicAppointment(id, managePhone);
      setMyAppointments(prev => prev.filter(a => a.id !== id));
      showToast('Agendamento cancelado.');
    } catch (err: any) {
      showToast(err.message || 'Erro ao cancelar agendamento.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  // Calculations for chosen services
  const chosenServicesObjects = services.filter(s => selectedServices.includes(s.id));
  const totalPrice = chosenServicesObjects.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = chosenServicesObjects.reduce((sum, s) => sum + s.durationMin, 0);

  // Same brand-color mechanism used by the backoffice (App.tsx), scoped to this standalone page
  // so a customer opening the booking link sees the barbershop's own colors, not a fixed indigo theme.
  const brandStyle = {
    '--color-brand-primary': company?.primaryColor || '#ba8b3f',
    '--color-brand-secondary': company?.secondaryColor || '#6f2f40',
  } as React.CSSProperties;

  // Cover photo backdrop for the company banner strip (dimmed for text contrast) — falls back
  // to the plain brand-color gradient via CSS classes when the company hasn't uploaded one.
  const bannerStyle: React.CSSProperties | undefined = company?.coverPhotoUrl
    ? {
        backgroundImage: `linear-gradient(rgba(15,23,42,0.45), rgba(15,23,42,0.45)), url(${company.coverPhotoUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : undefined;

  // Custom alert button to notify barber on WhatsApp
  const handleAlertBarberWhatsApp = () => {
    if (!successApt) return;
    const cleanPhone = company?.phone.replace(/\D/g, '') || '11999991234';
    const message = `Olá! Fiz um agendamento online na sua página ${company?.name || ''} para dia ${selectedDate.split('-').reverse().join('/')} às ${selectedTime}. Nome: ${customerName}. Aguardo sua confirmação!`;
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex flex-col" style={brandStyle}>
        {renderAdminBar()}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-ink-dim">Buscando agenda online...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-paper flex flex-col" style={brandStyle}>
        {renderAdminBar()}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-ink/10 p-6 max-w-sm text-center shadow-sm space-y-4">
            <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-ink font-sans tracking-tight">Erro de Carregamento</h2>
            <p className="text-sm text-ink-dim">{error || 'Página indisponível'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (success && successApt) {
    return (
      <div className="min-h-screen bg-paper flex flex-col" style={brandStyle}>
        {renderAdminBar()}
        <div className="flex-1 py-12 px-4 flex justify-center items-start overflow-y-auto">
          <div className="bg-card rounded-xl border border-ink/10 shadow-sm max-w-md w-full overflow-hidden p-6 text-center space-y-6">
            <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-sans font-bold text-ink tracking-tight">Agendamento Solicitado!</h2>
              <p className="text-xs text-ink-dim">Sua solicitação está pendente de confirmação com o barbeiro.</p>
            </div>

            {/* Recibo card details */}
            <div className="bg-paper-dim/50 border border-ink/10 p-4 rounded-lg text-xs text-left space-y-2.5">
              <div className="flex justify-between">
                <span className="text-ink-dim font-semibold">BARBEARIA:</span>
                <span className="font-bold text-ink uppercase">{company.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-dim font-semibold">PROFISSIONAL:</span>
                <span className="font-bold text-ink">{selectedStaffName || 'Qualquer Profissional Disponível'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-dim font-semibold">DATA & HORÁRIO:</span>
                <span className="font-bold text-ink">
                  {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-dim font-semibold">SERVIÇOS:</span>
                <span className="font-bold text-ink text-right max-w-[180px] truncate">
                  {chosenServicesObjects.map(s => s.name).join(', ')}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-ink/10 text-sm font-bold text-brand-primary">
                <span>VALOR ESTIMADO:</span>
                <span>R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleAlertBarberWhatsApp}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-sm"
              >
                Enviar Alerta via WhatsApp
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setStep(1);
                  setSelectedServices([]);
                  setSelectedStaffId('');
                  setSelectedTime('');
                }}
                className="w-full py-2 bg-card border border-ink/10 text-ink-dim rounded-lg text-xs font-semibold hover:bg-paper transition"
              >
                Fazer outro Agendamento
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col" style={brandStyle}>
      {renderAdminBar()}
      <div className="flex-1 py-12 px-4 flex justify-center items-start overflow-y-auto">
        <div className="bg-card rounded-xl border border-ink/10 shadow-sm max-w-lg w-full overflow-hidden self-start">
        {/* Banner header of Company */}
        <div
          className={`text-white p-6 relative ${!bannerStyle ? 'bg-gradient-to-r from-brand-secondary to-brand-primary' : ''}`}
          style={bannerStyle}
        >
          <span className="text-[10px] font-bold text-white/60 tracking-wider uppercase block">AGENDAMENTO ONLINE</span>
          <h1 className="text-xl font-sans font-bold mt-1 uppercase tracking-tight">{company.name}</h1>
          <p className="text-xs text-white/70 mt-1">{company.address || 'São Paulo - SP'}</p>
        </div>

        {/* Toggle between booking a new slot and managing an existing one */}
        <div className="flex border-b border-ink/10 bg-paper-dim/30 text-center">
          <button
            type="button"
            onClick={() => setViewMode('booking')}
            className={`flex-1 py-2.5 text-xs font-bold transition cursor-pointer ${viewMode === 'booking' ? 'text-brand-primary' : 'text-ink-dim hover:text-ink'}`}
          >
            Novo Agendamento
          </button>
          <button
            type="button"
            onClick={() => setViewMode('manage')}
            className={`flex-1 py-2.5 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${viewMode === 'manage' ? 'text-brand-primary' : 'text-ink-dim hover:text-ink'}`}
          >
            <CalendarX className="h-3.5 w-3.5" /> Gerenciar Agendamento
          </button>
        </div>

        {viewMode === 'manage' ? (
          <div className="p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-ink font-sans tracking-tight">Seus agendamentos</h2>
              <p className="text-xs text-ink-dim">Digite o celular usado na hora de agendar para ver e cancelar seus horários.</p>
            </div>

            <form onSubmit={handleSearchMyAppointments} className="flex gap-2">
              <input
                type="tel"
                required
                placeholder="Ex: (11) 99999-9999"
                value={managePhone}
                onChange={(e) => setManagePhone(formatPhoneBR(e.target.value))}
                maxLength={15}
                className="flex-1 border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
              <button
                type="submit"
                disabled={manageLoading}
                className="px-4 py-2 bg-brand-primary hover:opacity-90 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                {manageLoading ? '...' : 'Buscar'}
              </button>
            </form>

            {manageLoading ? (
              <div className="py-6 flex justify-center">
                <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : manageSearched && myAppointments.length === 0 ? (
              <p className="text-sm text-ink-dim italic py-6 text-center">Nenhum agendamento futuro encontrado para esse telefone.</p>
            ) : (
              <div className="space-y-2.5">
                {myAppointments.map(apt => (
                  <div key={apt.id} className="border border-ink/10 rounded-lg p-3.5 text-xs space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-ink text-sm">{apt.date.split('-').reverse().join('/')} às {apt.time}</p>
                        <p className="text-ink-dim mt-0.5">{apt.serviceNames.join(', ')}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full flex-shrink-0 ${apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {apt.status === 'confirmed' ? 'Confirmado' : 'Aguardando'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelMyAppointment(apt.id)}
                      disabled={cancellingId === apt.id}
                      className="w-full py-2 bg-card border border-bad/30 text-bad text-xs font-bold rounded-lg hover:bg-bad/10 transition disabled:opacity-50 cursor-pointer"
                    >
                      {cancellingId === apt.id ? 'Cancelando...' : 'Cancelar Agendamento'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <>
        {/* Step indicator rail */}
        <div className="flex border-b border-ink/10 bg-paper-dim/50 text-center">
          <div className={`flex-1 py-3 text-xs font-bold border-r border-ink/10 transition-all ${step === 1 ? 'bg-card text-brand-primary border-b-2 border-b-brand-primary' : 'text-ink-dim'}`}>
            1. Serviços
          </div>
          <div className={`flex-1 py-3 text-xs font-bold border-r border-ink/10 transition-all ${step === 2 ? 'bg-card text-brand-primary border-b-2 border-b-brand-primary' : 'text-ink-dim'}`}>
            2. Data & Hora
          </div>
          <div className={`flex-1 py-3 text-xs font-bold transition-all ${step === 3 ? 'bg-card text-brand-primary border-b-2 border-b-brand-primary' : 'text-ink-dim'}`}>
            3. Confirmação
          </div>
        </div>

        {/* STEP 1: Services catalogue selection */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-ink font-sans tracking-tight">Escolha os Serviços desejados</h2>
              <p className="text-xs text-ink-dim">Selecione quantos procedimentos quiser fazer no seu dia.</p>
            </div>

            <div className="divide-y divide-ink/10 border border-ink/10 rounded-lg overflow-hidden bg-card shadow-xs">
              {services.map((srv) => {
                const isSelected = selectedServices.includes(srv.id);
                return (
                  <div
                    key={srv.id}
                    onClick={() => handleToggleService(srv.id)}
                    className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition ${isSelected ? 'bg-brand-primary/5 border-l-4 border-brand-primary' : 'hover:bg-paper-dim/50'}`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-ink">{srv.name}</p>
                      <span className="text-xs text-ink-dim flex items-center gap-1 font-medium">
                        <Clock className="h-3.5 w-3.5 text-ink-dim" /> {srv.durationMin} minutos
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-ink text-sm">R$ {srv.price.toFixed(2)}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="rounded accent-brand-primary focus:ring-brand-primary h-4 w-4"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price/duration ticker card */}
            {selectedServices.length > 0 && (
              <div className="bg-brand-secondary text-white rounded-lg p-4 flex items-center justify-between shadow-sm animate-fade-in">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">RESUMO DA RESERVA</p>
                  <p className="text-xs font-semibold">{selectedServices.length} serviço(s) selecionado(s) • {totalDuration} min</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">PREÇO TOTAL</p>
                  <p className="text-base font-extrabold text-white">R$ {totalPrice.toFixed(2)}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleStep1Submit}
              className="w-full flex items-center justify-center gap-1 py-3 bg-brand-primary hover:opacity-90 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-sm"
            >
              Avançar para Horários <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Date & Time selector */}
        {step === 2 && (
          <div className="p-6 space-y-6">
            {/* Back to Step 1 */}
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-ink-dim hover:text-brand-primary text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Serviços
            </button>

            {staffList.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">PROFISSIONAL</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStaffId('')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-lg border transition cursor-pointer ${!selectedStaffId ? 'bg-brand-primary border-brand-primary text-white shadow-sm' : 'bg-card border-ink/10 text-ink-dim hover:bg-paper'}`}
                  >
                    <Users className="h-3.5 w-3.5" /> Qualquer um
                  </button>
                  {staffList.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStaffId(s.id)}
                      className={`py-2.5 px-2 text-xs font-bold rounded-lg border text-center transition cursor-pointer truncate ${selectedStaffId === s.id ? 'bg-brand-primary border-brand-primary text-white shadow-sm' : 'bg-card border-ink/10 text-ink-dim hover:bg-paper'}`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">DATA DE PREFERÊNCIA</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary bg-card"
                />
              </div>
              <div className="bg-paper-dim/50 rounded-lg p-3 border border-ink/10 flex flex-col justify-center text-xs">
                <span className="text-ink-dim font-bold block">RESUMO DA RESERVA:</span>
                <span className="font-semibold text-ink-dim mt-1">{selectedServices.length} serviços selecionados</span>
                <span className="font-semibold text-ink-dim">Duração prevista: {totalDuration} minutos</span>
              </div>
            </div>

            {/* Slot grid picker */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink-dim uppercase tracking-wider">HORÁRIOS DISPONÍVEIS</label>

              {slotsLoading ? (
                <div className="py-6 flex justify-center">
                  <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : slotsUnavailableReason === 'booking_disabled' ? (
                <p className="text-sm text-ink-dim italic py-6 text-center">Esta barbearia não está aceitando agendamentos online no momento.</p>
              ) : slotsUnavailableReason === 'closed' ? (
                <p className="text-sm text-ink-dim italic py-6 text-center">A barbearia não abre nesta data. Escolha outro dia.</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-ink-dim italic py-6 text-center">Nenhum horário livre encontrado para esta data.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto p-1">
                  {availableSlots.map(slot => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 text-xs font-bold rounded-lg border text-center transition cursor-pointer ${isSelected ? 'bg-brand-primary border-brand-primary text-white shadow-sm' : 'bg-card border-ink/10 text-ink-dim hover:bg-paper'}`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={handleStep2Submit}
              className="w-full flex items-center justify-center gap-1 py-3 bg-brand-primary hover:opacity-90 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-sm"
            >
              Avançar para Confirmação <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 3: Client Identity Form */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="p-6 space-y-6">
            {/* Back to Step 2 */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-ink-dim hover:text-brand-primary text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Calendário
            </button>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">SEU NOME COMPLETO</label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-dim">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Guilherme Souza"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full border border-ink/10 pl-9 pr-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">CELULAR COM WHATSAPP</label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-dim">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: (11) 99999-9999"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(formatPhoneBR(e.target.value))}
                    maxLength={15}
                    className="w-full border border-ink/10 pl-9 pr-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">OBSERVAÇÕES DO ATENDIMENTO (OPCIONAL)</label>
                <textarea
                  placeholder="Ex: Quero fazer um risco na sobrancelha ou um detalhe específico"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                />
              </div>
            </div>

            {/* Quick summary of finalized booking */}
            <div className="bg-paper-dim/50 border border-ink/10 rounded-lg p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-dim font-semibold">SERVIÇOS ESCOLHIDOS:</span>
                <span className="font-bold text-ink-dim">{chosenServicesObjects.map(s => s.name).join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-dim font-semibold">DATA & HORA DA RESERVA:</span>
                <span className="font-bold text-ink-dim">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-ink/10 text-sm font-bold text-brand-primary">
                <span>VALOR TOTAL ESTIMADO:</span>
                <span>R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-ink-dim cursor-pointer">
              <input
                type="checkbox"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="mt-0.5 rounded accent-brand-primary focus:ring-brand-primary h-4 w-4 flex-shrink-0"
              />
              <span>
                Concordo com o uso dos meus dados (nome, telefone) para realizar e gerenciar este agendamento.{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-brand-primary font-semibold hover:underline cursor-pointer"
                >
                  Ver política de privacidade
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-brand-primary hover:opacity-90 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {submitting ? 'Enviando sua reserva...' : 'Confirmar e Agendar Horário'}
            </button>
          </form>
        )}
        </>
        )}
      </div>
    </div>

    {showPrivacyModal && (
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-50 animate-fade-in"
        onClick={() => setShowPrivacyModal(false)}
      >
        <div
          className="bg-card rounded-xl border border-ink/10 max-w-md w-full overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 border-b border-ink/10 bg-paper flex items-center justify-between">
            <h3 className="text-base font-bold text-ink flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-brand-primary" /> Política de Privacidade
            </h3>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="text-ink-dim hover:text-ink font-bold cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 space-y-3 text-xs text-ink-dim leading-relaxed max-h-[60vh] overflow-y-auto">
            <p><strong className="text-ink">Quais dados coletamos:</strong> seu nome e número de celular, informados por você neste formulário.</p>
            <p><strong className="text-ink">Por que coletamos:</strong> exclusivamente para criar, confirmar e gerenciar o seu agendamento com {company?.name || 'este estabelecimento'}, incluindo o envio de mensagens de confirmação e lembrete por SMS ou WhatsApp.</p>
            <p><strong className="text-ink">Com quem compartilhamos:</strong> seus dados não são vendidos nem compartilhados com terceiros — ficam disponíveis apenas para {company?.name || 'o estabelecimento'} administrar seus próprios agendamentos.</p>
            <p><strong className="text-ink">Seus direitos:</strong> você pode solicitar a exclusão dos seus dados ou de um agendamento diretamente com {company?.name || 'o estabelecimento'}, ou usar a opção "Gerenciar Agendamento" nesta página para cancelar uma reserva a qualquer momento.</p>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
