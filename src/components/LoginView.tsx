/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api } from '../lib/api';
import { AlertCircle, ArrowRight, ShieldAlert, Info } from 'lucide-react';

interface LoginViewProps {
  onSuccess: (user: any, company: any) => void;
  onNavigateToRegister: () => void;
}

export default function LoginView({ onSuccess, onNavigateToRegister }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  // States for force password change flow (first access)
  const [forceChangeMode, setForceChangeMode] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login({ email, password });
      if (data.user && data.user.needsPasswordChange) {
        setTempPassword(password);
        setForceChangeMode(true);
      } else {
        onSuccess(data.user, data.company);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (newPassword.length < 4) {
      setError('A nova senha deve conter pelo menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      // 1. Redefine password in memory/file database
      await api.changePassword({
        email,
        password: tempPassword,
        newPassword
      });

      // 2. Perform login with new password to set final session tokens
      const finalLogin = await api.login({ email, password: newPassword });
      onSuccess(finalLogin.user, finalLogin.company);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };



  if (forceChangeMode) {
    return (
      <div className="min-h-screen bg-paper flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-wine flex items-center justify-center text-white shadow-md">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-display font-bold tracking-tight text-ink">
            Primeiro Acesso
          </h2>
          <p className="mt-2 text-center text-sm text-ink-dim">
            Por questões de segurança, você precisa alterar sua senha temporária para ativar sua conta do salão/barbearia.
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

            <form className="space-y-5" onSubmit={handleChangePasswordSubmit}>
              <div>
                <label className="block text-sm font-medium text-ink-dim">
                  Seu E-mail
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="appearance-none block w-full px-3 py-2.5 border border-ink/10 rounded-xl bg-paper text-ink-dim text-sm font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-ink-dim">
                  Defina Nova Senha *
                </label>
                <div className="mt-1">
                  <input
                    id="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 4 caracteres"
                    className="appearance-none block w-full px-3 py-2.5 border border-ink/10 rounded-xl placeholder-ink-dim/50 focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-dim">
                  Confirme a Nova Senha *
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="appearance-none block w-full px-3 py-2.5 border border-ink/10 rounded-xl placeholder-ink-dim/50 focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary text-sm"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 transition"
                >
                  {loading ? 'Alterando senha...' : 'Definir Senha & Acessar Painel'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (forgotMode) {
    return (
      <div className="min-h-screen bg-paper flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <img src="/logo-mark.png" alt="CM Studio" className="h-14 w-14 object-contain" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-display font-bold tracking-tight text-ink">
            Recuperar senha
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-card py-8 px-4 shadow-sm border border-ink/8 rounded-2xl sm:px-10">
            <div className="rounded-xl bg-brass-soft p-4 border border-brass/20 flex gap-3">
              <Info className="h-5 w-5 text-brass flex-shrink-0 mt-0.5" />
              <div className="text-sm text-ink">
                <p className="font-medium">Ainda não temos redefinição automática por e-mail.</p>
                <p className="mt-1 text-ink-dim">
                  Entre em contato com o administrador da sua barbearia ou com o suporte da plataforma
                  para receber uma senha temporária.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="mt-4 w-full flex justify-center py-2.5 px-4 border border-ink/10 rounded-xl shadow-sm text-sm font-medium text-ink-dim bg-card hover:bg-paper focus:outline-none"
            >
              Voltar para o login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src="/logo-mark.png" alt="CM Studio" className="h-14 w-14 object-contain" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-display font-bold tracking-tight text-ink">
          Entrar no CM Studio
        </h2>
        <p className="mt-2 text-center text-sm text-ink-dim">
          Ou{' '}
          <button
            onClick={onNavigateToRegister}
            className="font-medium text-ink hover:underline cursor-pointer"
          >
            criar nova conta SaaS para sua barbearia
          </button>
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

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-dim">
                E-mail
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="appearance-none block w-full px-3 py-2.5 border border-ink/10 rounded-xl placeholder-ink-dim/50 focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-ink-dim">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="text-xs font-medium text-ink-dim hover:underline"
                >
                  Esqueceu sua senha?
                </button>
              </div>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="appearance-none block w-full px-3 py-2.5 border border-ink/10 rounded-xl placeholder-ink-dim/50 focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-ink hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar na Barbearia'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>


        </div>
      </div>
    </div>
  );
}
