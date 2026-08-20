/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast, useConfirm } from '../lib/ui';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { formatPhoneBR } from '../lib/phone';
import { Client, Appointment } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  Cake,
  DollarSign,
  Calendar,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Edit2,
  Trash2
} from 'lucide-react';

interface ClientesViewProps {
  refreshTrigger: number;
  onRefresh: () => void;
}

export default function ClientesView({ refreshTrigger, onRefresh }: ClientesViewProps) {
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEscapeKey(() => setShowAddModal(false), showAddModal);
  useEscapeKey(() => setShowEditModal(false), showEditModal);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [notes, setNotes] = useState('');

  // Edit Form Fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [cltData, aptData] = await Promise.all([
        api.getClients(),
        api.getAppointments()
      ]);
      setClients(cltData);
      setAppointments(aptData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      showToast('Nome e telefone são campos obrigatórios.', 'error');
      return;
    }

    try {
      await api.createClient({ name, phone, birthDate, notes });
      setShowAddModal(false);
      setName('');
      setPhone('');
      setBirthDate('');
      setNotes('');
      onRefresh();
      loadData();
    } catch (err) {
      showToast('Erro ao cadastrar cliente.', 'error');
    }
  };

  const handleOpenEditClient = () => {
    if (!selectedClient) return;
    setEditName(selectedClient.name);
    setEditPhone(selectedClient.phone);
    setEditBirthDate(selectedClient.birthDate || '');
    setEditNotes(selectedClient.notes || '');
    setShowEditModal(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    if (!editName || !editPhone) {
      showToast('Nome e telefone são campos obrigatórios.', 'error');
      return;
    }

    try {
      const updated = await api.updateClient(selectedClient.id, {
        name: editName,
        phone: editPhone,
        birthDate: editBirthDate,
        notes: editNotes
      });
      setSelectedClient(updated);
      setShowEditModal(false);
      onRefresh();
      loadData();
    } catch (err) {
      showToast('Erro ao atualizar cliente.', 'error');
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    const confirmed = await confirmDialog(
      `Deseja excluir permanentemente o cliente "${selectedClient.name}"? Isso não afeta o histórico de agendamentos já registrado.`,
      { danger: true, confirmLabel: 'Excluir' }
    );
    if (confirmed) {
      try {
        await api.deleteClient(selectedClient.id);
        setSelectedClient(null);
        onRefresh();
        loadData();
      } catch (err) {
        showToast('Erro ao excluir cliente.', 'error');
      }
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.replace(/\D/g, '').includes(search.replace(/\D/g, ''))
  );

  return (
    <div className="space-y-6">
      {/* Header and Search block */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-dim">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Pesquisar cliente por nome ou celular..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-ink/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary shadow-2xs"
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Cadastrar Cliente
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Clients list */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-ink/10 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-ink/10 bg-paper flex justify-between items-center">
              <span className="text-xs font-bold text-ink-dim tracking-wider uppercase">CLIENTES CADASTRADOS</span>
              <span className="text-xs font-bold text-ink-dim">{filteredClients.length} cadastrados</span>
            </div>

            {filteredClients.length === 0 ? (
              <div className="py-20 text-center text-ink-dim text-sm">
                Nenhum cliente correspondente encontrado.
              </div>
            ) : (
              <div className="divide-y divide-ink/8 max-h-[600px] overflow-y-auto">
                {filteredClients.map((client) => {
                  const isSelected = selectedClient?.id === client.id;
                  return (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition ${isSelected ? 'bg-brand-primary/5 border-r-4 border-brand-primary' : 'hover:bg-paper'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-paper-dim text-ink-dim flex items-center justify-center font-bold text-sm">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-ink text-sm">{client.name}</h4>
                          <p className="text-xs text-ink-dim">{client.phone}</p>
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <p className="font-bold text-ink">R$ {client.totalSpent.toFixed(2)}</p>
                        <p className="text-ink-dim font-medium">{client.visitsCount} visitas</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Client details and historical log */}
          <div className="bg-card rounded-xl border border-ink/10 shadow-sm p-6 flex flex-col justify-between">
            {selectedClient ? (
              <div className="space-y-6">
                {/* General client info */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-brand-primary text-white rounded-full flex items-center justify-center font-extrabold text-base">
                        {selectedClient.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-ink text-base">{selectedClient.name}</h3>
                        <p className="text-xs text-ink-dim">Membro desde {new Date(selectedClient.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={handleOpenEditClient}
                        className="p-2 bg-card border border-ink/10 text-ink-dim rounded-lg hover:bg-paper hover:text-brand-primary transition cursor-pointer"
                        title="Editar Cliente"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={handleDeleteClient}
                        className="p-2 bg-card border border-ink/10 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
                        title="Excluir Cliente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-ink-dim border-t border-b border-ink/10 py-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-ink-dim" />
                      <span>{selectedClient.phone}</span>
                    </div>
                    {selectedClient.birthDate && (
                      <div className="flex items-center gap-2">
                        <Cake className="h-4 w-4 text-ink-dim" />
                        <span>Aniversário: {selectedClient.birthDate.split('-').reverse().join('/')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance stats bento block */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-paper p-3 rounded-lg border border-ink/10 text-center">
                    <DollarSign className="h-4 w-4 text-brand-primary mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-ink-dim block">TOTAL GASTO</span>
                    <span className="text-sm font-extrabold text-ink">R$ {selectedClient.totalSpent.toFixed(2)}</span>
                  </div>
                  <div className="bg-paper p-3 rounded-lg border border-ink/10 text-center">
                    <Calendar className="h-4 w-4 text-brand-primary mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-ink-dim block">VISITAS</span>
                    <span className="text-sm font-extrabold text-ink">{selectedClient.visitsCount} vezes</span>
                  </div>
                </div>

                {/* Notes */}
                {selectedClient.notes && (
                  <div className="space-y-1 bg-amber-50 p-3.5 rounded-lg border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-amber-600" /> Ficha Técnica / Notas
                    </span>
                    <p className="text-xs text-ink-dim italic">"{selectedClient.notes}"</p>
                  </div>
                )}

                {/* History list */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-ink-dim tracking-wider uppercase block">HISTÓRICO RECENTE</span>
                  
                  {appointments.filter(a => a.clientId === selectedClient.id).length === 0 ? (
                    <p className="text-xs text-ink-dim italic">Nenhum atendimento finalizado registrado.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                      {appointments
                        .filter(a => a.clientId === selectedClient.id)
                        .sort((a,b) => b.date.localeCompare(a.date))
                        .map(apt => (
                          <div key={apt.id} className="flex items-center justify-between gap-2 p-2 bg-paper rounded-lg text-xs border border-ink/10">
                            <div>
                              <span className="font-bold text-ink block">{apt.date.split('-').reverse().join('/')}</span>
                              <span className="text-[10px] text-ink-dim font-semibold">{apt.serviceNames.join(', ')}</span>
                            </div>
                            <span className="font-bold text-ink">R${apt.totalPrice.toFixed(0)}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-ink-dim text-sm space-y-3 flex-1 flex flex-col justify-center">
                <Users className="h-8 w-8 mx-auto stroke-1 text-ink-dim/50" />
                <p>Selecione um cliente para ver a ficha técnica e histórico financeiro.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Register Client Dialog */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-50 animate-fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <form
            onSubmit={handleCreateClient}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-xl border border-ink/10 max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-ink/10 bg-paper flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Cadastrar Cliente</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-ink-dim hover:text-ink font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">NOME DO CLIENTE</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do cliente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">CELULAR / TELEFONE</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: (11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                  maxLength={15}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">DATA DE NASCIMENTO (OPCIONAL)</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">OBSERVAÇÕES / PREFERÊNCIAS</label>
                <textarea
                  placeholder="Ex: Prefere corte degradê alto, toalha quente, cafezinho..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                />
              </div>
            </div>

            <div className="bg-paper p-4 border-t border-ink/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-ink/10 text-ink-dim text-xs font-bold rounded-lg hover:bg-paper-dim transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition shadow-xs"
              >
                Salvar Cadastro
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Edit Client Dialog */}
      {showEditModal && selectedClient && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-50 animate-fade-in"
          onClick={() => setShowEditModal(false)}
        >
          <form
            onSubmit={handleUpdateClient}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-xl border border-ink/10 max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-ink/10 bg-paper flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Editar Cliente</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-ink-dim hover:text-ink font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">NOME DO CLIENTE</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">CELULAR / TELEFONE</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(formatPhoneBR(e.target.value))}
                  maxLength={15}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">DATA DE NASCIMENTO (OPCIONAL)</label>
                <input
                  type="date"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">OBSERVAÇÕES / PREFERÊNCIAS</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                />
              </div>
            </div>

            <div className="bg-paper p-4 border-t border-ink/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-ink/10 text-ink-dim text-xs font-bold rounded-lg hover:bg-paper-dim transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition shadow-xs"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
