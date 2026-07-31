/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api } from '../lib/api';
import { AlertCircle, ArrowLeft, Building, Sparkles } from 'lucide-react';

interface RegisterViewProps {
  onSuccess: (user: any, company: any) => void;
  onNavigateToLogin: () => void;
}

export default function RegisterView({ onSuccess, onNavigateToLogin }: RegisterViewProps) {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.register({
        name,
        companyName,
        email,
        phone,
        password,
      });
      onSuccess(data.user, data.company);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src="/logo-mark.png" alt="CM Studio" className="h-14 w-14 object-contain" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-display font-bold tracking-tight text-ink">
          Crie seu CM Studio
        </h2>
        <p className="mt-2 text-center text-sm text-ink-dim">
          Registre sua barbearia e comece a gerenciar hoje mesmo.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-sm border border-ink/8 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3.5 border border-red-100 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-ink-dim">
                Nome da Barbearia
              </label>
              <div className="mt-1 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-dim">
                  <Building className="h-4 w-4" />
                </div>
                <input
                  id="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Barbearia do Zé"
                  className="appearance-none block w-full pl-9 pr-3 py-2.5 border border-ink/10 rounded-xl placeholder-ink-dim/50 focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink-dim">
                Seu Nome Completo
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="appearance-none block w-full px-3 py-2.5 border border-ink/10 rounded-xl placeholder-ink-dim/50 focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-ink-dim">
                Telefone de Contato
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className="appearance-none block w-full px-3 py-2.5 border border-ink/10 rounded-xl placeholder-ink-dim/50 focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-dim">
                E-mail Corporativo
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@minhabarbearia.com"
                  className="appearance-none block w-full px-3 py-2.5 border border-ink/10 rounded-xl placeholder-ink-dim/50 focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-dim">
                Definir Senha
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="appearance-none block w-full px-3 py-2.5 border border-ink/10 rounded-xl placeholder-ink-dim/50 focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink text-sm"
                />
              </div>
            </div>

            <div className="rounded-xl bg-paper p-3 border border-ink/8 flex items-start gap-2 text-xs text-ink-dim mt-2">
              <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                Ao se registrar, sua barbearia será criada instantaneamente com serviços padrão como Corte Social e Barba já configurados.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-ink hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink disabled:opacity-50"
              >
                {loading ? 'Criando sua estrutura SaaS...' : 'Criar Barbearia SaaS'}
              </button>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-ink/8 flex items-center justify-center">
            <button
              onClick={onNavigateToLogin}
              className="flex items-center gap-1.5 text-xs font-medium text-ink-dim hover:text-ink transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
