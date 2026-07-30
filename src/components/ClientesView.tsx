/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../lib/ui';
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
  ArrowRight
} from 'lucide-react';

interface ClientesViewProps {
  refreshTrigger: number;
  onRefresh: () => void;
}

export default function ClientesView({ refreshTrigger, onRefresh }: ClientesViewProps) {
  const showToast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [notes, setNotes] = useState('');

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

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.replace(/\D/g, '').includes(search.replace(/\D/g, ''))
  );

  return (
    <div className="space-y-6">
      {/* Header and Search block */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Pesquisar cliente por nome ou celular..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary shadow-2xs"
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
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">CLIENTES CADASTRADOS</span>
              <span className="text-xs font-bold text-slate-600">{filteredClients.length} cadastrados</span>
            </div>

            {filteredClients.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-sm">
                Nenhum cliente correspondente encontrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {filteredClients.map((client) => {
                  const isSelected = selectedClient?.id === client.id;
                  return (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition ${isSelected ? 'bg-brand-primary/5 border-r-4 border-brand-primary' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{client.name}</h4>
                          <p className="text-xs text-slate-500">{client.phone}</p>
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <p className="font-bold text-slate-900">R$ {client.totalSpent.toFixed(2)}</p>
                        <p className="text-slate-400 font-medium">{client.visitsCount} visitas</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Client details and historical log */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
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
                        <h3 className="font-bold text-slate-900 text-base">{selectedClient.name}</h3>
                        <p className="text-xs text-slate-500">Membro desde {new Date(selectedClient.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 border-t border-b border-slate-200 py-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span>{selectedClient.phone}</span>
                    </div>
                    {selectedClient.birthDate && (
                      <div className="flex items-center gap-2">
                        <Cake className="h-4 w-4 text-slate-400" />
                        <span>Aniversário: {selectedClient.birthDate.split('-').reverse().join('/')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance stats bento block */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <DollarSign className="h-4 w-4 text-brand-primary mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-slate-400 block">TOTAL GASTO</span>
                    <span className="text-sm font-extrabold text-slate-900">R$ {selectedClient.totalSpent.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <Calendar className="h-4 w-4 text-brand-primary mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-slate-400 block">VISITAS</span>
                    <span className="text-sm font-extrabold text-slate-900">{selectedClient.visitsCount} vezes</span>
                  </div>
                </div>

                {/* Notes */}
                {selectedClient.notes && (
                  <div className="space-y-1 bg-amber-50 p-3.5 rounded-lg border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-amber-600" /> Ficha Técnica / Notas
                    </span>
                    <p className="text-xs text-slate-700 italic">"{selectedClient.notes}"</p>
                  </div>
                )}

                {/* History list */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">HISTÓRICO RECENTE</span>
                  
                  {appointments.filter(a => a.clientId === selectedClient.id).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nenhum atendimento finalizado registrado.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                      {appointments
                        .filter(a => a.clientId === selectedClient.id)
                        .sort((a,b) => b.date.localeCompare(a.date))
                        .map(apt => (
                          <div key={apt.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg text-xs border border-slate-200">
                            <div>
                              <span className="font-bold text-slate-800 block">{apt.date.split('-').reverse().join('/')}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">{apt.serviceNames.join(', ')}</span>
                            </div>
                            <span className="font-bold text-slate-900">R${apt.totalPrice.toFixed(0)}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400 text-sm space-y-3 flex-1 flex flex-col justify-center">
                <Users className="h-8 w-8 mx-auto stroke-1 text-slate-300" />
                <p>Selecione um cliente para ver a ficha técnica e histórico financeiro.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Register Client Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleCreateClient}
            className="bg-white rounded-xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Cadastrar Cliente</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-950 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">NOME DO CLIENTE</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do cliente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">CELULAR / TELEFONE</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: (11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">DATA DE NASCIMENTO (OPCIONAL)</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">OBSERVAÇÕES / PREFERÊNCIAS</label>
                <textarea
                  placeholder="Ex: Prefere corte degradê alto, toalha quente, cafezinho..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition"
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
    </div>
  );
}
