/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getTodayStr } from '../lib/date';
import { useToast, useConfirm } from '../lib/ui';
import { Appointment, Company } from '../types';
import { Clock, Check, X, LogOut, CalendarClock, Bell, Scissors } from 'lucide-react';

interface TabletModeViewProps {
  company: Company | null;
  onExit: () => void;
}

// Polling interval — this screen is meant to sit unattended on a counter tablet all day, so it
// needs to pick up new online bookings and confirmations on its own without anyone touching it.
const POLL_INTERVAL_MS = 20000;

export default function TabletModeView({ company, onExit }: TabletModeViewProps) {
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const brandStyle = {
    '--color-brand-primary': company?.primaryColor || '#ba8b3f',
    '--color-brand-secondary': company?.secondaryColor || '#6f2f40',
  } as React.CSSProperties;

  const loadData = async () => {
    try {
      const data = await api.getAppointments();
      setAppointments(data);
    } catch {
      // Silent — an unattended tablet should keep showing the last good data, not an error screen.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const dataInterval = setInterval(loadData, POLL_INTERVAL_MS);
    const clockInterval = setInterval(() => setNow(new Date()), 15000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const todayStr = getTodayStr();
  const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const upcomingToday = appointments
    .filter(a => a.date === todayStr && a.status === 'confirmed' && a.time >= nowHHMM)
    .sort((a, b) => a.time.localeCompare(b.time));

  const pending = appointments
    .filter(a => a.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const handleConfirm = async (apt: Appointment) => {
    setActingOnId(apt.id);
    try {
      await api.updateAppointment(apt.id, { status: 'confirmed' });
      showToast(`Agendamento de ${apt.clientName} confirmado!`);
      loadData();
    } catch {
      showToast('Erro ao confirmar agendamento.', 'error');
    } finally {
      setActingOnId(null);
    }
  };

  const handleDecline = async (apt: Appointment) => {
    const ok = await confirmDialog(`Recusar o agendamento de ${apt.clientName}?`, {
      danger: true,
      confirmLabel: 'Recusar',
    });
    if (!ok) return;
    setActingOnId(apt.id);
    try {
      await api.updateAppointment(apt.id, { status: 'cancelled' });
      loadData();
    } catch {
      showToast('Erro ao recusar agendamento.', 'error');
    } finally {
      setActingOnId(null);
    }
  };

  const formatDateShort = (dateStr: string) => {
    if (dateStr === todayStr) return 'Hoje';
    const d = new Date(`${dateStr}T00:00:00-03:00`);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div style={brandStyle} className="min-h-screen bg-paper text-ink flex flex-col">
      {/* Header */}
      <header className="bg-rail text-paper px-6 py-5 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="Logo" className="h-11 w-11 object-contain rounded-full border border-brass-soft flex-shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-11 w-11 rounded-full border border-brass p-1.5 flex items-center justify-center flex-shrink-0">
              <img src="/logo-mark.png" alt="CM Studio" className="h-full w-full object-contain" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display font-bold text-xl tracking-tight truncate">{company?.name || 'CM Studio'}</h1>
            <p className="text-[11px] font-bold text-brass uppercase tracking-widest">Modo Tablet</p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden sm:flex items-center gap-2 text-paper/80 font-mono">
            <Clock className="h-5 w-5 text-brass" />
            <span className="text-2xl font-bold tabular-nums">
              {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-paper/80 hover:text-paper rounded-lg text-sm font-semibold transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Body: two panes */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 lg:grid-rows-1 gap-5 p-5 lg:p-6 overflow-hidden">
        {/* Próximos Atendimentos */}
        <section className="bg-card rounded-[22px_8px_22px_8px] border border-ink/10 shadow-sm flex flex-col overflow-hidden min-h-0">
          <div className="px-6 py-5 border-b border-ink/10 flex items-center gap-2.5 flex-shrink-0">
            <CalendarClock className="h-6 w-6 text-brand-primary" />
            <h2 className="text-xl font-display font-bold text-ink">Próximos Atendimentos</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : upcomingToday.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Scissors className="h-10 w-10 text-ink-dim mx-auto" />
                <p className="text-base text-ink-dim font-medium">Nenhum atendimento restante hoje.</p>
              </div>
            ) : (
              upcomingToday.map((apt, i) => (
                <div
                  key={apt.id}
                  className={`p-4 rounded-[16px_6px_16px_6px] border flex items-center gap-4 ${
                    i === 0 ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-paper border-ink/10'
                  }`}
                >
                  <div className={`flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[76px] ${i === 0 ? 'bg-brand-primary text-white' : 'bg-card border border-ink/10 text-ink'}`}>
                    <span className="text-2xl font-bold tabular-nums leading-none">{apt.time}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-ink truncate">{apt.clientName}</p>
                    <p className="text-sm text-ink-dim truncate">{apt.serviceNames.join(', ')}</p>
                  </div>
                  {i === 0 && (
                    <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider bg-brand-primary/15 px-2.5 py-1 rounded-full flex-shrink-0">
                      Próximo
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Aguardando Confirmação */}
        <section className="bg-card rounded-[22px_8px_22px_8px] border border-ink/10 shadow-sm flex flex-col overflow-hidden min-h-0">
          <div className="px-6 py-5 border-b border-ink/10 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <Bell className="h-6 w-6 text-wine" />
              <h2 className="text-xl font-display font-bold text-ink">Aguardando Confirmação</h2>
            </div>
            {pending.length > 0 && (
              <span className="h-7 w-7 flex items-center justify-center rounded-full bg-wine text-paper text-sm font-bold">
                {pending.length}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Check className="h-10 w-10 text-ink-dim mx-auto" />
                <p className="text-base text-ink-dim font-medium">Nada pendente por aqui.</p>
              </div>
            ) : (
              pending.map(apt => (
                <div key={apt.id} className="p-4 rounded-[16px_6px_16px_6px] border border-wine-soft bg-wine-soft/20 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[76px] bg-card border border-ink/10">
                      <span className="text-[11px] font-bold text-ink-dim uppercase">{formatDateShort(apt.date)}</span>
                      <span className="text-xl font-bold text-ink tabular-nums leading-none">{apt.time}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold text-ink truncate">{apt.clientName}</p>
                      <p className="text-sm text-ink-dim truncate">{apt.serviceNames.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleConfirm(apt)}
                      disabled={actingOnId === apt.id}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-ok text-white rounded-xl font-bold text-base hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                    >
                      <Check className="h-5 w-5" /> Confirmar
                    </button>
                    <button
                      onClick={() => handleDecline(apt)}
                      disabled={actingOnId === apt.id}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-card border border-bad/30 text-bad rounded-xl font-bold text-base hover:bg-bad/10 transition cursor-pointer disabled:opacity-50"
                    >
                      <X className="h-5 w-5" /> Recusar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
