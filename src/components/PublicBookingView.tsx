/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { getTodayStr } from '../lib/date';
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
  ArrowLeft
} from 'lucide-react';

interface PublicBookingViewProps {
  slug: string;
  onBackToAdmin?: () => void;
}

export default function PublicBookingView({ slug, onBackToAdmin }: PublicBookingViewProps) {
  const showToast = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Step tracker
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Services, 2: Date & Time, 3: Contact & Confirm
  const [success, setSuccess] = useState(false);
  const [successApt, setSuccessApt] = useState<any>(null);

  // Scheduling selections
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
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
  const [submitting, setSubmitting] = useState(false);

  // Available slots for selected date
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const renderAdminBar = () => {
    if (!onBackToAdmin) return null;
    return (
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold shadow-md border-b border-slate-800 shrink-0 w-full">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
          <span>Modo de Visualização: Portal do Cliente (Agendamento Online)</span>
        </div>
        <button
          type="button"
          onClick={onBackToAdmin}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition cursor-pointer text-xs flex items-center gap-1.5 shadow-sm"
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
        const data = await api.getPublicAvailability(company.slug, selectedDate, durationForSelection);
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
  }, [selectedDate, settings, company, services, selectedServices]);

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

    try {
      setSubmitting(true);
      const data = await api.createPublicBooking({
        companyId: company!.id,
        name: customerName,
        phone: customerPhone,
        date: selectedDate,
        time: selectedTime,
        serviceIds: selectedServices,
        notes: customerNotes
      });
      setSuccessApt(data.appointment);
      setSuccess(true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao realizar agendamento.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations for chosen services
  const chosenServicesObjects = services.filter(s => selectedServices.includes(s.id));
  const totalPrice = chosenServicesObjects.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = chosenServicesObjects.reduce((sum, s) => sum + s.durationMin, 0);

  // Same brand-color mechanism used by the backoffice (App.tsx), scoped to this standalone page
  // so a customer opening the booking link sees the barbershop's own colors, not a fixed indigo theme.
  const brandStyle = {
    '--color-brand-primary': company?.primaryColor || '#4f46e5',
    '--color-brand-secondary': company?.secondaryColor || '#312e81',
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
      <div className="min-h-screen bg-slate-50 flex flex-col" style={brandStyle}>
        {renderAdminBar()}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Buscando agenda online...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" style={brandStyle}>
        {renderAdminBar()}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm text-center shadow-sm space-y-4">
            <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">Erro de Carregamento</h2>
            <p className="text-sm text-slate-500">{error || 'Página indisponível'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (success && successApt) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" style={brandStyle}>
        {renderAdminBar()}
        <div className="flex-1 py-12 px-4 flex justify-center items-start overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden p-6 text-center space-y-6">
            <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-sans font-bold text-slate-900 tracking-tight">Agendamento Solicitado!</h2>
              <p className="text-xs text-slate-500">Sua solicitação está pendente de confirmação com o barbeiro.</p>
            </div>

            {/* Recibo card details */}
            <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-lg text-xs text-left space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">BARBEARIA:</span>
                <span className="font-bold text-slate-800 uppercase">{company.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">PROFISSIONAL:</span>
                <span className="font-bold text-slate-800">Qualquer Barbeiro Disponível</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">DATA & HORÁRIO:</span>
                <span className="font-bold text-slate-800">
                  {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">SERVIÇOS:</span>
                <span className="font-bold text-slate-800 text-right max-w-[180px] truncate">
                  {chosenServicesObjects.map(s => s.name).join(', ')}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-brand-primary">
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
                  setSelectedTime('');
                }}
                className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
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
    <div className="min-h-screen bg-slate-50 flex flex-col" style={brandStyle}>
      {renderAdminBar()}
      <div className="flex-1 py-12 px-4 flex justify-center items-start overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-lg w-full overflow-hidden self-start">
        {/* Banner header of Company */}
        <div
          className={`text-white p-6 relative ${!bannerStyle ? 'bg-gradient-to-r from-brand-secondary to-brand-primary' : ''}`}
          style={bannerStyle}
        >
          <span className="text-[10px] font-bold text-white/60 tracking-wider uppercase block">AGENDAMENTO ONLINE</span>
          <h1 className="text-xl font-sans font-bold mt-1 uppercase tracking-tight">{company.name}</h1>
          <p className="text-xs text-white/70 mt-1">{company.address || 'São Paulo - SP'}</p>
        </div>

        {/* Step indicator rail */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 text-center">
          <div className={`flex-1 py-3 text-xs font-bold border-r border-slate-200 transition-all ${step === 1 ? 'bg-white text-brand-primary border-b-2 border-b-brand-primary' : 'text-slate-400'}`}>
            1. Serviços
          </div>
          <div className={`flex-1 py-3 text-xs font-bold border-r border-slate-200 transition-all ${step === 2 ? 'bg-white text-brand-primary border-b-2 border-b-brand-primary' : 'text-slate-400'}`}>
            2. Data & Hora
          </div>
          <div className={`flex-1 py-3 text-xs font-bold transition-all ${step === 3 ? 'bg-white text-brand-primary border-b-2 border-b-brand-primary' : 'text-slate-400'}`}>
            3. Confirmação
          </div>
        </div>

        {/* STEP 1: Services catalogue selection */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 font-sans tracking-tight">Escolha os Serviços desejados</h2>
              <p className="text-xs text-slate-500">Selecione quantos procedimentos quiser fazer no seu dia.</p>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
              {services.map((srv) => {
                const isSelected = selectedServices.includes(srv.id);
                return (
                  <div
                    key={srv.id}
                    onClick={() => handleToggleService(srv.id)}
                    className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition ${isSelected ? 'bg-brand-primary/5 border-l-4 border-brand-primary' : 'hover:bg-slate-50/50'}`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900">{srv.name}</p>
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> {srv.durationMin} minutos
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-slate-900 text-sm">R$ {srv.price.toFixed(2)}</span>
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
              className="flex items-center gap-1 text-slate-500 hover:text-brand-primary text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Serviços
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">DATA DE PREFERÊNCIA</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white"
                />
              </div>
              <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200 flex flex-col justify-center text-xs">
                <span className="text-slate-400 font-bold block">RESUMO DA RESERVA:</span>
                <span className="font-semibold text-slate-700 mt-1">{selectedServices.length} serviços selecionados</span>
                <span className="font-semibold text-slate-700">Duração prevista: {totalDuration} minutos</span>
              </div>
            </div>

            {/* Slot grid picker */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">HORÁRIOS DISPONÍVEIS</label>

              {slotsLoading ? (
                <div className="py-6 flex justify-center">
                  <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : slotsUnavailableReason === 'booking_disabled' ? (
                <p className="text-sm text-slate-400 italic py-6 text-center">Esta barbearia não está aceitando agendamentos online no momento.</p>
              ) : slotsUnavailableReason === 'closed' ? (
                <p className="text-sm text-slate-400 italic py-6 text-center">A barbearia não abre nesta data. Escolha outro dia.</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-6 text-center">Nenhum horário livre encontrado para esta data.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto p-1">
                  {availableSlots.map(slot => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 text-xs font-bold rounded-lg border text-center transition cursor-pointer ${isSelected ? 'bg-brand-primary border-brand-primary text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
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
              className="flex items-center gap-1 text-slate-500 hover:text-brand-primary text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Calendário
            </button>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">SEU NOME COMPLETO</label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Guilherme Souza"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full border border-slate-200 pl-9 pr-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">CELULAR COM WHATSAPP</label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: (11) 99999-9999"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full border border-slate-200 pl-9 pr-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">OBSERVAÇÕES DO ATENDIMENTO (OPCIONAL)</label>
                <textarea
                  placeholder="Ex: Quero fazer um risco na sobrancelha ou um detalhe específico"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                />
              </div>
            </div>

            {/* Quick summary of finalized booking */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">SERVIÇOS ESCOLHIDOS:</span>
                <span className="font-bold text-slate-700">{chosenServicesObjects.map(s => s.name).join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">DATA & HORA DA RESERVA:</span>
                <span className="font-bold text-slate-700">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-brand-primary">
                <span>VALOR TOTAL ESTIMADO:</span>
                <span>R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-brand-primary hover:opacity-90 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {submitting ? 'Enviando sua reserva...' : 'Confirmar e Agendar Horário'}
            </button>
          </form>
        )}
      </div>
    </div>
    </div>
  );
}
