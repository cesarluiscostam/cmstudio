/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast, useConfirm } from '../lib/ui';
import { User } from '../types';
import {
  Plus,
  Trash2
} from 'lucide-react';

interface TeamViewProps {
  currentUserId: string;
  refreshTrigger: number;
  onRefresh: () => void;
}

export default function TeamView({ currentUserId, refreshTrigger, onRefresh }: TeamViewProps) {
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const [team, setTeam] = useState<Omit<User, 'password'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

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

  useEffect(() => {
    loadTeam();
  }, [refreshTrigger]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast('Nome, e-mail e senha são obrigatórios.', 'error');
      return;
    }

    try {
      await api.createTeamMember({ name, email, phone, password });
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      onRefresh();
      loadTeam();
    } catch (err: any) {
      showToast(err.message || 'Erro ao adicionar membro da equipe.', 'error');
    }
  };

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
            <span className="text-xs font-bold text-ink-dim">{team.length} pessoas</span>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleCreateMember}
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
                  onChange={(e) => setPhone(e.target.value)}
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
    </div>
  );
}
