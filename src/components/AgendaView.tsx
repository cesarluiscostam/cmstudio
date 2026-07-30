/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { getTodayStr } from '../lib/date';
import { useToast, useConfirm } from '../lib/ui';
import { Appointment, Client, Service, Company } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  Trash2,
  Smartphone,
  ExternalLink,
  Edit2
} from 'lucide-react';

interface AgendaViewProps {
  company: Company | null;
  onOpenNewAppointment: () => void;
  refreshTrigger: number;
  onRefresh: () => void;
}

export default function AgendaView({ company, onOpenNewAppointment, refreshTrigger, onRefresh }: AgendaViewProps) {
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [viewType, setViewType] = useState<'day' | 'week' | 'list'>('day');
  const [loading, setLoading] = useState(true);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Edit fields
  const [editClient, setEditClient] = useState('');
  const [editServices, setEditServices] = useState<string[]>([]);
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<Appointment['status']>('confirmed');

  // Create fields (integrated directly in Agenda for ease)
  const [newClient, setNewClient] = useState('');
  const [newServices, setNewServices] = useState<string[]>([]);
  const [newDate, setNewDate] = useState(getTodayStr());
  const [newTime, setNewTime] = useState('10:00');
  const [newNotes, setNewNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [aptData, srvData, cltData] = await Promise.all([
        api.getAppointments(),
        api.getServices(),
        api.getClients()
      ]);
      setAppointments(aptData);
      setServices(srvData);
      setClients(cltData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, refreshTrigger]);

  const handlePrevDay = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayStr());
  };

  // Status Styles
  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1">✓ Confirmado</span>;
      case 'pending':
        return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-full flex items-center gap-1 animate-soft-pulse">● Aguardando aprovação</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-full flex items-center gap-1">Concluído</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-full flex items-center gap-1">Cancelado</span>;
    }
  };

  const getStatusColorClass = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-50/40 hover:bg-emerald-50 border-l-4 border-emerald-500 text-emerald-950';
      case 'pending': return 'bg-amber-50/40 hover:bg-amber-50 border-l-4 border-amber-500 text-amber-950';
      case 'completed': return 'bg-indigo-50/40 hover:bg-indigo-50 border-l-4 border-indigo-500 text-indigo-950';
      case 'cancelled': return 'bg-slate-100 hover:bg-slate-150 border-l-4 border-slate-400 text-slate-500 line-through';
    }
  };

  // Open Details
  const handleOpenDetail = (apt: Appointment) => {
    setSelectedApt(apt);
    setShowDetailModal(true);
  };

  // Action Operations
  const handleUpdateStatus = async (id: string, newStatus: Appointment['status']) => {
    try {
      await api.updateAppointment(id, { status: newStatus });
      setShowDetailModal(false);
      onRefresh();
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar status', 'error');
    }
  };

  const handleDeleteApt = async (id: string) => {
    const confirmed = await confirmDialog('Tem certeza que deseja excluir permanentemente este agendamento?', {
      danger: true,
      confirmLabel: 'Excluir',
    });
    if (confirmed) {
      try {
        await api.deleteAppointment(id);
        setShowDetailModal(false);
        onRefresh();
        loadData();
      } catch (err) {
        showToast('Erro ao excluir agendamento', 'error');
      }
    }
  };

  // Open Edit
  const handleOpenEdit = () => {
    if (!selectedApt) return;
    setEditClient(selectedApt.clientId);
    setEditServices(selectedApt.serviceIds);
    setEditTime(selectedApt.time);
    setEditNotes(selectedApt.notes || '');
    setEditStatus(selectedApt.status);
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApt) return;

    try {
      await api.updateAppointment(selectedApt.id, {
        clientId: editClient,
        time: editTime,
        serviceIds: editServices,
        notes: editNotes,
        status: editStatus
      });
      setShowEditModal(false);
      onRefresh();
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar agendamento.', 'error');
    }
  };

  // New Booking Creation (from Agenda Shortcut)
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient || newServices.length === 0) {
      showToast('Selecione um cliente e pelo menos um serviço.', 'error');
      return;
    }

    try {
      await api.createAppointment({
        clientId: newClient,
        date: newDate,
        time: newTime,
        serviceIds: newServices,
        notes: newNotes,
        status: 'confirmed'
      });
      setShowCreateModal(false);
      // Reset
      setNewClient('');
      setNewServices([]);
      setNewNotes('');
      onRefresh();
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar agendamento.', 'error');
    }
  };

  // Auto Calculations for Create Form
  const selectedServicesObjects = services.filter(s => newServices.includes(s.id));
  const autoTotalPrice = selectedServicesObjects.reduce((sum, s) => sum + s.price, 0);
  const autoTotalDuration = selectedServicesObjects.reduce((sum, s) => sum + s.durationMin, 0);

  // Edit auto-calculation
  const editServicesObjects = services.filter(s => editServices.includes(s.id));
  const editTotalPrice = editServicesObjects.reduce((sum, s) => sum + s.price, 0);
  const editTotalDuration = editServicesObjects.reduce((sum, s) => sum + s.durationMin, 0);

  // Generate WhatsApp Message Template link
  const getWhatsAppLink = (apt: Appointment, type: 'confirm' | 'reminder' | 'done') => {
    const formattedPhone = apt.clientPhone.replace(/\D/g, '');
    const businessName = company?.name || 'nosso estabelecimento';
    let text = '';

    if (type === 'confirm') {
      text = `Olá, ${apt.clientName}! Seu agendamento na ${businessName} está confirmado para dia ${apt.date.split('-').reverse().join('/')} às ${apt.time} para realizar o serviço: ${apt.serviceNames.join(', ')}. Valor total: R$ ${apt.totalPrice.toFixed(2)}. Aguardamos você!`;
    } else if (type === 'reminder') {
      text = `E aí, ${apt.clientName}! Passando para lembrar do seu horário hoje (${apt.date.split('-').reverse().join('/')}) às ${apt.time} na ${businessName}. Se precisar remarcar, nos avise. Até já!`;
    } else {
      text = `Prontinho, ${apt.clientName}! Seu atendimento foi concluído com sucesso. Obrigado pela preferência e nos vemos na próxima! Abraços de toda a equipe ${businessName}.`;
    }

    return `https://wa.me/55${formattedPhone}?text=${encodeURIComponent(text)}`;
  };

  // Filter current day appointments
  const dayAppointments = appointments.filter(a => a.date === selectedDate);

  // Filter week appointments (Monday to Saturday containing selectedDate)
  const getWeekDays = (refDateStr: string) => {
    const refDate = new Date(`${refDateStr}T00:00:00`);
    const day = refDate.getDay();
    const diff = refDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when Sunday
    const startOfWeek = new Date(refDate.setDate(diff));

    const days = [];
    for (let i = 0; i < 6; i++) { // Mon to Sat
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + i);
      days.push(current.toISOString().split('T')[0]);
    }
    return days;
  };

  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="space-y-6">
      {/* Calendar Navigation Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-white hover:shadow-xs rounded-md transition cursor-pointer text-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold px-2.5 text-slate-800">
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
            </span>
            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-white hover:shadow-xs rounded-md transition cursor-pointer text-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleSetToday}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            Hoje
          </button>

          <span className="text-sm font-semibold text-slate-700 hidden md:inline ml-2">
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* View Switches & Create shortcut */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewType('day')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${viewType === 'day' ? 'bg-white text-brand-primary font-semibold shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Dia
            </button>
            <button
              onClick={() => setViewType('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${viewType === 'week' ? 'bg-white text-brand-primary font-semibold shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewType('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${viewType === 'list' ? 'bg-white text-brand-primary font-semibold shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Lista completa
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-3 py-2 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Novo Horário
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Day View */}
          {viewType === 'day' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-bold text-slate-400 tracking-wider">CRONOGRAMA DO DIA</span>
                <span className="text-xs font-bold text-slate-600">{dayAppointments.length} agendamentos registrados</span>
              </div>

              {dayAppointments.length === 0 ? (
                <div className="py-24 text-center text-slate-400 text-sm space-y-3">
                  <CalendarIcon className="h-8 w-8 mx-auto stroke-1" />
                  <p>Sua agenda está vazia para este dia.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-xs font-bold text-brand-primary hover:opacity-80 underline hover:no-underline cursor-pointer"
                  >
                    Marcar primeiro cliente
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {dayAppointments
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((apt) => (
                      <div
                        key={apt.id}
                        onClick={() => handleOpenDetail(apt)}
                        className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition ${getStatusColorClass(apt.status)}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs font-mono flex-shrink-0">
                            {apt.time}
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-900 text-sm">{apt.clientName}</h4>
                            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-600">
                              <span className="flex items-center gap-1 font-medium">
                                <Clock className="h-3.5 w-3.5 text-slate-400" /> {apt.totalDurationMin} min
                              </span>
                              <span className="font-semibold text-slate-700">
                                {apt.serviceNames.join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-900">R$ {apt.totalPrice.toFixed(2)}</p>
                            <p className="text-[10px] text-slate-400">À cobrar</p>
                          </div>
                          <div>
                            {getStatusBadge(apt.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Week View */}
          {viewType === 'week' && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {weekDays.map((dayStr, index) => {
                const dayApts = appointments.filter(a => a.date === dayStr);
                const isSelected = dayStr === selectedDate;
                const dateObj = new Date(`${dayStr}T00:00:00`);

                return (
                  <div
                    key={dayStr}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col min-h-[350px] ${isSelected ? 'border-brand-primary ring-1 ring-brand-primary' : 'border-slate-200'}`}
                  >
                    <div
                      onClick={() => setSelectedDate(dayStr)}
                      className={`p-3 text-center border-b border-slate-200 cursor-pointer transition ${isSelected ? 'bg-brand-primary text-white' : 'bg-slate-50/50 hover:bg-slate-100'}`}
                    >
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/70' : 'text-slate-400 opacity-60'}`}>
                        {dateObj.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </p>
                      <p className="text-lg font-display font-extrabold">
                        {dateObj.getDate()}
                      </p>
                    </div>

                    <div className="p-2 flex-1 space-y-2 overflow-y-auto">
                      {dayApts.length === 0 ? (
                        <div className="h-full flex items-center justify-center py-10 text-center">
                          <p className="text-[10px] text-slate-400 font-semibold">Sem compromissos</p>
                        </div>
                      ) : (
                        dayApts
                          .sort((a,b) => a.time.localeCompare(b.time))
                          .map(apt => (
                            <div
                              key={apt.id}
                              onClick={() => handleOpenDetail(apt)}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${getStatusColorClass(apt.status)}`}
                            >
                              <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                                <span>{apt.time}</span>
                                <span>R${apt.totalPrice.toFixed(0)}</span>
                              </div>
                              <p className="font-semibold text-slate-900 truncate">{apt.clientName}</p>
                              <p className="text-[10px] text-slate-500 truncate">{apt.serviceNames.join(', ')}</p>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Complete List View */}
          {viewType === 'list' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">HISTÓRICO GERAL DE AGENDAMENTOS</span>
                <span className="text-xs text-slate-400 font-medium">{appointments.length} itens no total</span>
              </div>

              {appointments.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-sm">
                  Nenhum agendamento encontrado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/50 font-semibold text-slate-500 text-xs">
                      <tr>
                        <th className="px-6 py-3.5 text-left">Data/Hora</th>
                        <th className="px-6 py-3.5 text-left">Cliente</th>
                        <th className="px-6 py-3.5 text-left">Serviços</th>
                        <th className="px-6 py-3.5 text-left">Preço</th>
                        <th className="px-6 py-3.5 text-left">Status</th>
                        <th className="px-6 py-3.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {appointments
                        .sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
                        .map(apt => (
                          <tr key={apt.id} className="hover:bg-slate-50/40 transition">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-bold text-slate-950">{apt.date.split('-').reverse().join('/')}</span>
                              <span className="text-slate-400 ml-1.5 font-semibold text-xs">{apt.time}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <span className="font-semibold text-slate-900 block">{apt.clientName}</span>
                                <span className="text-slate-400 text-xs">{apt.clientPhone}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-slate-600 line-clamp-1 text-xs">{apt.serviceNames.join(', ')}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                              R$ {apt.totalPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(apt.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => handleOpenDetail(apt)}
                                className="text-xs font-bold text-brand-primary hover:opacity-80 hover:underline cursor-pointer"
                              >
                                Ver Detalhes
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: Appointment Details Popup */}
      {showDetailModal && selectedApt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-xl animate-fade-in">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Gerenciar Atendimento</h3>
                <p className="text-[10px] font-mono text-slate-400">ID: {selectedApt.id}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-950 font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Client Info */}
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center font-bold text-base">
                  {selectedApt.clientName.substring(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-lg">{selectedApt.clientName}</h4>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Smartphone className="h-4 w-4 text-slate-400" /> {selectedApt.clientPhone}
                  </p>
                </div>
              </div>

              {/* Appointment Specifics */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-lg border border-slate-200 text-sm">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">DATA & HORA</span>
                  <span className="font-bold text-slate-800">
                    {selectedApt.date.split('-').reverse().join('/')} às {selectedApt.time}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">DURAÇÃO</span>
                  <span className="font-bold text-slate-800">{selectedApt.totalDurationMin} minutos</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">SERVIÇOS</span>
                  <span className="font-bold text-slate-800">{selectedApt.serviceNames.join(', ')}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">VALOR TOTAL</span>
                  <span className="font-extrabold text-brand-primary text-base">R$ {selectedApt.totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedApt.notes && (
                <div className="space-y-1.5">
                  <span className="text-slate-400 text-xs font-bold block">OBSERVAÇÕES DO BARBEIRO</span>
                  <p className="text-sm text-slate-700 italic bg-slate-50/70 p-3 rounded-lg border-l-2 border-slate-400">
                    "{selectedApt.notes}"
                  </p>
                </div>
              )}

              {/* Status Indicator */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-bold text-slate-400">STATUS ATUAL:</span>
                {getStatusBadge(selectedApt.status)}
              </div>

              {/* WhatsApp Integration templates */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block">NOTIFICAÇÕES VIA WHATSAPP (MOCKUP)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <a
                    href={getWhatsAppLink(selectedApt, 'confirm')}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 hover:border-brand-primary hover:text-brand-primary text-slate-700 text-xs font-bold rounded-lg transition text-center"
                  >
                    Enviar Confirmação <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                  <a
                    href={getWhatsAppLink(selectedApt, 'reminder')}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 hover:border-brand-primary hover:text-brand-primary text-slate-700 text-xs font-bold rounded-lg transition text-center"
                  >
                    Enviar Lembrete <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                  <a
                    href={getWhatsAppLink(selectedApt, 'done')}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 hover:border-brand-primary hover:text-brand-primary text-slate-700 text-xs font-bold rounded-lg transition text-center"
                  >
                    Avisar Conclusão <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50/50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteApt(selectedApt.id)}
                  className="p-2.5 bg-white border border-slate-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition cursor-pointer"
                  title="Excluir Horário"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleOpenEdit}
                  className="flex items-center gap-1 py-2 px-3.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-brand-primary hover:border-brand-primary/30 text-xs font-bold transition cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Editar
                </button>
              </div>

              {/* Status updates shortcuts */}
              <div className="flex items-center gap-2">
                {selectedApt.status === 'pending' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedApt.id, 'confirmed')}
                    className="py-2 px-4 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition cursor-pointer shadow-sm"
                  >
                    Aprovar Horário
                  </button>
                )}
                {selectedApt.status === 'confirmed' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedApt.id, 'cancelled')}
                      className="py-2 px-3 bg-white border border-red-200 text-red-700 text-xs font-bold rounded-lg hover:bg-red-50 transition cursor-pointer"
                    >
                      Cancelar Horário
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedApt.id, 'completed')}
                      className="py-2 px-4 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Concluir Atendimento
                    </button>
                  </>
                )}
                {selectedApt.status === 'completed' && (
                  <span className="text-xs text-indigo-600 font-bold">Atendimento Finalizado ✓</span>
                )}
                {selectedApt.status === 'cancelled' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedApt.id, 'confirmed')}
                    className="py-2 px-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  >
                    Reativar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Appointment Dialog */}
      {showEditModal && selectedApt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-fade-in"
          >
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Editar Agendamento</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-950 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">CLIENTE</label>
                <select
                  value={editClient}
                  onChange={(e) => setEditClient(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">HORÁRIO</label>
                  <input
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">STATUS</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white"
                  >
                    <option value="confirmed">Confirmado</option>
                    <option value="pending">Pendente</option>
                    <option value="completed">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">SERVIÇOS (MÚLTIPLOS)</label>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto border border-slate-200 p-2.5 rounded-lg bg-slate-50/50">
                  {services.map((srv) => {
                    const isChecked = editServices.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition ${isChecked ? 'bg-white border-brand-primary/30 shadow-sm text-brand-primary font-bold' : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-100'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditServices([...editServices, srv.id]);
                            } else {
                              setEditServices(editServices.filter(id => id !== srv.id));
                            }
                          }}
                          className="rounded accent-brand-primary focus:ring-brand-primary h-3.5 w-3.5"
                        />
                        <span>{srv.name} (R${srv.price})</span>
                      </label>
                    );
                  })}
                </div>
                {/* Visual calculation indicators */}
                <div className="flex justify-between text-xs font-semibold text-slate-500 mt-2 px-1">
                  <span>Duração total: {editTotalDuration} min</span>
                  <span>Valor total: R$ {editTotalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">OBSERVAÇÕES</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex: Cliente tem alergia a gel de barbear"
                  rows={2}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                />
              </div>
            </div>

            <div className="bg-slate-50/50 p-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition shadow-sm"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Create New Appointment Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveCreate}
            className="bg-white rounded-xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-fade-in"
          >
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Novo Agendamento</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-950 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">CLIENTE</label>
                <select
                  required
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white"
                >
                  <option value="">-- Selecione o Cliente --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">DATA</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">HORA</label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">SERVIÇOS (MÚLTIPLOS)</label>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto border border-slate-200 p-2.5 rounded-lg bg-slate-50/50">
                  {services.map((srv) => {
                    const isChecked = newServices.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition ${isChecked ? 'bg-white border-brand-primary/30 shadow-sm text-brand-primary font-bold' : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-100'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewServices([...newServices, srv.id]);
                            } else {
                              setNewServices(newServices.filter(id => id !== srv.id));
                            }
                          }}
                          className="rounded accent-brand-primary focus:ring-brand-primary h-3.5 w-3.5"
                        />
                        <span>{srv.name} (R${srv.price})</span>
                      </label>
                    );
                  })}
                </div>
                {/* Visual calculation indicators */}
                <div className="flex justify-between text-xs font-semibold text-slate-500 mt-2 px-1">
                  <span>Duração total estimada: {autoTotalDuration} min</span>
                  <span>Valor total estimado: R$ {autoTotalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">OBSERVAÇÕES DO ATENDIMENTO</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Corte degradê alto, toalha quente, cafezinho"
                  rows={2}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                />
              </div>
            </div>

            <div className="bg-slate-50/50 p-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition shadow-sm"
              >
                Criar Agendamento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
