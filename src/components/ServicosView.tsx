/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast, useConfirm } from '../lib/ui';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { Service } from '../types';
import {
  Scissors,
  Plus,
  Clock,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit,
  Smile
} from 'lucide-react';

interface ServicosViewProps {
  refreshTrigger: number;
  onRefresh: () => void;
}

export default function ServicosView({ refreshTrigger, onRefresh }: ServicosViewProps) {
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSrv, setSelectedSrv] = useState<Service | null>(null);

  useEscapeKey(() => setShowAddModal(false), showAddModal);
  useEscapeKey(() => setShowEditModal(false), showEditModal);

  // Form Fields
  const [name, setName] = useState('');
  const [durationMin, setDurationMin] = useState(30);
  const [price, setPrice] = useState(40);
  const [active, setActive] = useState(true);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await api.getServices();
      setServices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [refreshTrigger]);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || durationMin <= 0 || price < 0) {
      showToast('Dados inválidos. Preencha todos os campos.', 'error');
      return;
    }

    try {
      await api.createService({ name, durationMin, price, active });
      setShowAddModal(false);
      setName('');
      setDurationMin(30);
      setPrice(40);
      setActive(true);
      onRefresh();
      loadServices();
    } catch (err) {
      showToast('Erro ao criar serviço.', 'error');
    }
  };

  const handleToggleActive = async (srv: Service) => {
    try {
      await api.updateService(srv.id, { active: !srv.active });
      loadServices();
      onRefresh();
    } catch (err) {
      showToast('Erro ao atualizar status do serviço.', 'error');
    }
  };

  const handleDeleteService = async (id: string) => {
    const confirmed = await confirmDialog('Deseja excluir permanentemente este serviço?', {
      danger: true,
      confirmLabel: 'Excluir',
    });
    if (confirmed) {
      try {
        await api.deleteService(id);
        loadServices();
        onRefresh();
      } catch (err) {
        showToast('Erro ao excluir serviço.', 'error');
      }
    }
  };

  const handleOpenEdit = (srv: Service) => {
    setSelectedSrv(srv);
    setName(srv.name);
    setDurationMin(srv.durationMin);
    setPrice(srv.price);
    setActive(srv.active);
    setShowEditModal(true);
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSrv) return;

    try {
      await api.updateService(selectedSrv.id, {
        name,
        durationMin,
        price,
        active
      });
      setShowEditModal(false);
      setName('');
      setDurationMin(30);
      setPrice(40);
      setActive(true);
      loadServices();
      onRefresh();
    } catch (err) {
      showToast('Erro ao atualizar serviço.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink">Catálogo de Serviços</h2>
          <p className="text-sm text-ink-dim">Defina os tempos e valores de cada procedimento.</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Adicionar Serviço
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((srv) => (
            <div
              key={srv.id}
              className={`bg-card rounded-xl border p-5 flex flex-col justify-between space-y-4 shadow-sm transition ${srv.active ? 'border-ink/10 hover:border-brand-primary/30' : 'border-ink/10/60 bg-paper-dim/50 opacity-75'}`}
            >
              {/* Header and Active indicator */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 bg-brand-primary text-white rounded-lg flex items-center justify-center shadow-2xs">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-sm">{srv.name}</h3>
                    <span className="text-[10px] text-ink-dim font-bold uppercase">PRESTAÇÃO DIRETA</span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleActive(srv)}
                  className="text-ink-dim hover:text-brand-primary transition cursor-pointer"
                  title={srv.active ? 'Desativar Serviço' : 'Ativar Serviço'}
                >
                  {srv.active ? (
                    <ToggleRight className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-ink-dim/50" />
                  )}
                </button>
              </div>

              {/* Specifics bento values */}
              <div className="grid grid-cols-2 gap-2 bg-paper-dim/70 p-3 rounded-lg border border-ink/10 text-xs">
                <div>
                  <span className="text-ink-dim font-semibold block">DURAÇÃO</span>
                  <span className="font-bold text-ink flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-ink-dim" /> {srv.durationMin} minutos
                  </span>
                </div>
                <div>
                  <span className="text-ink-dim font-semibold block">VALOR</span>
                  <span className="font-extrabold text-brand-primary text-sm flex items-center gap-0.5 mt-0.5">
                    R$ {srv.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-ink/10">
                <span className="text-[10px] font-bold text-ink-dim">
                  {srv.active ? '● Ativo para agendamentos' : '○ Suspenso do catálogo'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(srv)}
                    className="p-1.5 bg-paper border border-ink/10 hover:border-brand-primary hover:text-brand-primary rounded-lg transition cursor-pointer"
                    title="Editar Serviço"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(srv.id)}
                    className="p-1.5 bg-paper border border-ink/10 hover:border-red-500 hover:text-red-600 rounded-lg transition cursor-pointer"
                    title="Excluir Serviço"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Add Service */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-50 animate-fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <form
            onSubmit={handleCreateService}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-xl border border-ink/10 max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-ink/10 bg-paper flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Novo Serviço</h3>
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
                <label className="block text-xs font-bold text-ink-dim mb-1">NOME DO SERVIÇO</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sobrancelha Navalhada"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-dim mb-1">DURAÇÃO (MINUTOS)</label>
                  <input
                    type="number"
                    required
                    min={5}
                    step={5}
                    value={durationMin || ''}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-dim mb-1">PREÇO (R$)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-semibold text-ink-dim">Disponível para agendamento online</span>
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className="text-ink-dim hover:text-brand-primary transition cursor-pointer"
                >
                  {active ? (
                    <ToggleRight className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-ink-dim/50" />
                  )}
                </button>
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
                Cadastrar Serviço
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Edit Service */}
      {showEditModal && selectedSrv && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-50 animate-fade-in"
          onClick={() => setShowEditModal(false)}
        >
          <form
            onSubmit={handleUpdateService}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-xl border border-ink/10 max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-ink/10 bg-paper flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Editar Serviço</h3>
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
                <label className="block text-xs font-bold text-ink-dim mb-1">NOME DO SERVIÇO</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-dim mb-1">DURAÇÃO (MINUTOS)</label>
                  <input
                    type="number"
                    required
                    min={5}
                    step={5}
                    value={durationMin || ''}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-dim mb-1">PREÇO (R$)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-semibold text-ink-dim">Disponível para agendamento online</span>
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className="text-ink-dim hover:text-brand-primary transition cursor-pointer"
                >
                  {active ? (
                    <ToggleRight className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-ink-dim/50" />
                  )}
                </button>
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
