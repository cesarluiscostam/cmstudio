/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast, useConfirm } from '../lib/ui';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { formatPhoneBR } from '../lib/phone';
import { getTodayStr } from '../lib/date';
import { User } from '../types';
import {
  Plus,
  Trash2,
  Percent,
  ChevronLeft,
  ChevronRight,
  DollarSign
} from 'lucide-react';

interface TeamViewProps {
  currentUserId: string;
  refreshTrigger: number;
  onRefresh: () => void;
}

interface CommissionRow {
  staffId: string;
  staffName: string;
  commissionPercent: number;
  completedCount: number;
  totalRevenue: number;
  commissionOwed: number;
}

export default function TeamView({ currentUserId, refreshTrigger, onRefresh }: TeamViewProps) {
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const [team, setTeam] = useState<Omit<User, 'password'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Omit<User, 'password'> | null>(null);
  const [editCommissionPercent, setEditCommissionPercent] = useState('');

  useEscapeKey(() => setShowAddModal(false), showAddModal);
  useEscapeKey(() => setEditingMember(null), !!editingMember);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('');

  // Commission report
  const [commissionMonth, setCommissionMonth] = useState(getTodayStr().substring(0, 7));
  const [commissionReport, setCommissionReport] = useState<CommissionRow[]>([]);
  const [loadingCommissions, setLoadingCommissions] = useState(true);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const data = await api.getTeam();
      setTeam(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    try {
      setLoadingCommissions(true);
      const data = await api.getTeamCommissions(commissionMonth);
      setCommissionReport(data.report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCommissions(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [refreshTrigger]);

  useEffect(() => {
    loadCommissions();
  }, [refreshTrigger, commissionMonth]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast('Nome, e-mail e senha são obrigatórios.', 'error');
      return;
    }

    try {
      await api.createTeamMember({
        name, email, phone, password,
        commissionPercent: commissionPercent ? Number(commissionPercent) : undefined
      });
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setCommissionPercent('');
      onRefresh();
      loadTeam();
    } catch (err: any) {
      showToast(err.message || 'Erro ao adicionar membro da equipe.', 'error');
    }
  };

  const handleOpenEditCommission = (member: Omit<User, 'password'>) => {
    setEditingMember(member);
    setEditCommissionPercent(member.commissionPercent !== undefined ? String(member.commissionPercent) : '');
  };

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      await api.updateTeamMember(editingMember.id, {
        commissionPercent: editCommissionPercent ? Number(editCommissionPercent) : null
      });
      setEditingMember(null);
      onRefresh();
      loadTeam();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar comissão.', 'error');
    }
  };

  const shiftCommissionMonth = (delta: number) => {
    const [y, m] = commissionMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCommissionMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  const commissionMonthLabel = (() => {
    const label = new Date(`${commissionMonth}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  })();

  const handleDeleteMember = async (id: string, memberName: string) => {
    const confirmed = await confirmDialog(
      `Deseja remover "${memberName}" da equipe? Essa pessoa perde acesso ao sistema imediatamente.`,
      { danger: true, confirmLabel: 'Remover' }
    );
    if (confirmed) {
      try {
        await api.deleteTeamMember(id);
        onRefresh();
        loadTeam();
      } catch (err: any) {
        showToast(err.message || 'Erro ao remover membro da equipe.', 'error');
      }
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'manager': return 'Gerente';
      case 'admin': return 'Administrador';
      case 'staff': return 'Funcionário';
      case 'barber': return 'Barbeiro';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink">Equipe</h2>
          <p className="text-sm text-ink-dim">Gerencie quem tem acesso ao sistema da sua empresa.</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Adicionar Funcionário
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-ink/10 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-ink/10 bg-paper flex justify-between items-center">
            <span className="text-xs font-bold text-ink-dim tracking-wider uppercase">MEMBROS DA EQUIPE</span>
            <span className="text-xs font-bold text-ink-dim">{team.length} {team.length === 1 ? 'pessoa' : 'pessoas'}</span>
          </div>
          <div className="divide-y divide-ink/8">
            {team.map((member) => (
              <div key={member.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-paper-dim text-ink-dim flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-ink text-sm flex items-center gap-1.5 truncate">
                      {member.name}
                      {member.id === currentUserId && (
                        <span className="text-[9px] font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded uppercase flex-shrink-0">Você</span>
                      )}
                    </h4>
                    <p className="text-xs text-ink-dim truncate">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[10px] font-bold text-ink-dim uppercase bg-paper border border-ink/10 px-2 py-1 rounded">
                    {roleLabel(member.role)}
                  </span>
                  <button
                    onClick={() => handleOpenEditCommission(member)}
                    className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded border transition cursor-pointer ${
                      member.commissionPercent
                        ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary hover:bg-brand-primary/15'
                        : 'bg-paper border-ink/10 text-ink-dim hover:bg-paper-dim'
                    }`}
                    title="Definir comissão"
                  >
                    <Percent className="h-3 w-3" />
                    {member.commissionPercent ? `${member.commissionPercent}%` : 'Sem comissão'}
                  </button>
                  {member.id !== currentUserId && (
                    <button
                      onClick={() => handleDeleteMember(member.id, member.name)}
                      className="p-1.5 bg-card border border-ink/10 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
                      title="Remover da Equipe"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Add Team Member */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-50 animate-fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <form
            onSubmit={handleCreateMember}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-xl border border-ink/10 max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-ink/10 bg-paper flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Adicionar Funcionário</h3>
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
                <label className="block text-xs font-bold text-ink-dim mb-1">NOME COMPLETO</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Felipe Rodrigues"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">E-MAIL DE ACESSO</label>
                <input
                  type="email"
                  required
                  placeholder="felipe@suaempresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">TELEFONE (OPCIONAL)</label>
                <input
                  type="tel"
                  placeholder="Ex: (11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                  maxLength={15}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">SENHA PROVISÓRIA</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <p className="text-[10px] text-ink-dim mt-1">Compartilhe essa senha com o funcionário. Ele poderá alterá-la depois.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">COMISSÃO (% OPCIONAL)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  placeholder="Ex: 40"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <p className="text-[10px] text-ink-dim mt-1">% do valor de cada atendimento concluído que fica para esse profissional.</p>
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
                Adicionar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Edit Commission */}
      {editingMember && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-50 animate-fade-in"
          onClick={() => setEditingMember(null)}
        >
          <form
            onSubmit={handleSaveCommission}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-xl border border-ink/10 max-w-sm w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-ink/10 bg-paper flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Comissão de {editingMember.name}</h3>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-ink-dim hover:text-ink font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-2">
              <label className="block text-xs font-bold text-ink-dim mb-1">COMISSÃO (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                placeholder="Ex: 40 (deixe vazio para remover)"
                value={editCommissionPercent}
                onChange={(e) => setEditCommissionPercent(e.target.value)}
                autoFocus
                className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
              <p className="text-[10px] text-ink-dim">% do valor de cada atendimento concluído que fica para esse profissional.</p>
            </div>
            <div className="bg-paper p-4 border-t border-ink/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 border border-ink/10 text-ink-dim text-xs font-bold rounded-lg hover:bg-paper-dim transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition shadow-xs"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Commission Report */}
      <div className="bg-card rounded-xl border border-ink/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-ink/10 bg-paper flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-brand-primary" />
            <span className="text-xs font-bold text-ink-dim tracking-wider uppercase">Comissões</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftCommissionMonth(-1)}
              className="p-1.5 rounded-lg border border-ink/10 text-ink-dim hover:text-ink hover:bg-paper-dim transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-ink min-w-[130px] text-center">{commissionMonthLabel}</span>
            <button
              onClick={() => shiftCommissionMonth(1)}
              className="p-1.5 rounded-lg border border-ink/10 text-ink-dim hover:text-ink hover:bg-paper-dim transition cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loadingCommissions ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink/10 text-sm">
              <thead className="bg-paper-dim/50 font-semibold text-ink-dim text-xs">
                <tr>
                  <th className="px-6 py-3.5 text-left">Profissional</th>
                  <th className="px-6 py-3.5 text-left">Comissão</th>
                  <th className="px-6 py-3.5 text-left">Atendimentos</th>
                  <th className="px-6 py-3.5 text-left">Faturado</th>
                  <th className="px-6 py-3.5 text-left">A Pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 text-ink-dim">
                {commissionReport.map(row => (
                  <tr key={row.staffId} className="hover:bg-paper-dim/40 transition">
                    <td className="px-6 py-4 font-semibold text-ink whitespace-nowrap">{row.staffName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{row.commissionPercent || 0}%</td>
                    <td className="px-6 py-4 whitespace-nowrap">{row.completedCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">R$ {row.totalRevenue.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-brand-primary">R$ {row.commissionOwed.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
