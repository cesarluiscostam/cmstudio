/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Award,
  Wallet,
  Clock,
  ArrowUpRight,
  Plus,
  UserPlus,
  ChevronRight,
  MinusCircle,
  Activity,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface DashboardViewProps {
  company: { primaryColor?: string; secondaryColor?: string } | null;
  onNavigate: (tab: string) => void;
  onOpenNewAppointment: () => void;
  onOpenNewClient: () => void;
  onOpenNewExpense: () => void;
  refreshTrigger: number;
}

export default function DashboardView({
  company,
  onNavigate,
  onOpenNewAppointment,
  onOpenNewClient,
  onOpenNewExpense,
  refreshTrigger
}: DashboardViewProps) {
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentMonthLabel = (() => {
    const label = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  })();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data.stats);
      setCharts(data.charts);
    } catch (err: any) {
      setError('Erro ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Carregando indicadores...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <p className="text-red-500 font-medium mb-4">{error || 'Erro inesperado'}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium text-sm hover:opacity-90 transition"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const brandPrimary = company?.primaryColor || '#4f46e5';
  const COLORS = [brandPrimary, '#6366f1', '#818cf8', '#a5b4fc', '#cbd5e1'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Olá, Carlos Silva
          </h1>
          <p className="text-sm text-slate-500">
            Painel Geral da Barbearia • {(() => {
              const formatted = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
              return formatted.charAt(0).toUpperCase() + formatted.slice(1);
            })()}
          </p>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenNewAppointment}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 transition cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Agendamento
          </button>
          <button
            onClick={onOpenNewClient}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" /> Novo Cliente
          </button>
          <button
            onClick={onOpenNewExpense}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition cursor-pointer"
          >
            <MinusCircle className="h-3.5 w-3.5" /> Registrar Despesa
          </button>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Metric Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Agendamentos</span>
            <Calendar className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-slate-900">{stats.appointmentsToday}</span>
            <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{stats.confirmedToday} confirmados</span>
            </div>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Faturamento Hoje</span>
            <DollarSign className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-slate-900">
              R$ {stats.revenueToday.toFixed(2)}
            </span>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              +{stats.completedToday} atendimentos hoje
            </p>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Receita Mensal</span>
            <TrendingUp className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-slate-900">
              R$ {stats.revenueMonth.toFixed(2)}
            </span>
            <p className="mt-1 text-xs text-slate-500">Mês de {currentMonthLabel}</p>
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Clientes Atendidos</span>
            <Users className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-slate-900">{stats.clientsServicedToday}</span>
            <p className="mt-1 text-xs text-slate-500">Finalizados hoje</p>
          </div>
        </div>

        {/* Metric Card 5 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Ticket Médio</span>
            <Award className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-slate-900">
              R$ {stats.ticketAverage.toFixed(2)}
            </span>
            <p className="mt-1 text-xs text-slate-500">Por atendimento concluído</p>
          </div>
        </div>

        {/* Metric Card 6 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Saldo em Caixa</span>
            <Wallet className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-slate-900">
              R$ {stats.cashBalance.toFixed(2)}
            </span>
            <p className="mt-1 text-xs text-slate-500">Fluxo líquido total</p>
          </div>
        </div>
      </div>

      {/* Primary Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Charts & Visualizers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Revenue Area Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Faturamento Diário</h3>
                <p className="text-xs text-slate-500">{currentMonthLabel}</p>
              </div>
              <span className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
                Últimos 15 dias
              </span>
            </div>

            <div className="h-72 w-full">
              {charts?.revenueChart && charts.revenueChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.revenueChart}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={brandPrimary} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={brandPrimary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$${v}`}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <Tooltip
                      formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento']}
                      contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke={brandPrimary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Sem transações registradas neste mês.
                </div>
              )}
            </div>
          </div>

          {/* Secondary Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Services Popularity Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-5">Serviços Mais Vendidos</h3>
              <div className="h-56 flex items-center justify-center">
                {charts?.servicesChart && charts.servicesChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.servicesChart} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#475569', fontSize: 10, width: 100 }}
                        width={110}
                      />
                      <Tooltip
                        formatter={(value: any) => [value, 'Vendas']}
                        contentStyle={{ background: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                        {charts.servicesChart.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-slate-400 text-xs">Sem dados históricos.</span>
                )}
              </div>
            </div>

            {/* Week Movement Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-5">Movimento por Dia</h3>
              <div className="h-56">
                {charts?.busyDaysChart && charts.busyDaysChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.busyDaysChart}>
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                      />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value: any) => [value, 'Atendimentos']}
                        contentStyle={{ background: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                      />
                      <Bar dataKey="count" fill={brandPrimary} radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-slate-400 text-xs">Sem agendamentos.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Next Client & Quick shortcuts */}
        <div className="space-y-6">
          {/* Next Client / Próximo Atendimento */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 bg-amber-50 rounded-bl-2xl">
              <Sparkles className="h-4 w-4 text-amber-500 animate-soft-pulse" />
            </div>

            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-brand-primary" /> Próximo Atendimento
            </h3>

            {stats.nextClient ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-semibold text-sm">
                    {stats.nextClient.clientName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{stats.nextClient.clientName}</h4>
                    <p className="text-xs text-slate-500">{stats.nextClient.clientPhone}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Horário:</span>
                    <span className="text-slate-900 font-semibold">{stats.nextClient.time} às {addMinutesToTime(stats.nextClient.time, stats.nextClient.totalDurationMin)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Serviços:</span>
                    <span className="text-slate-900 font-semibold text-right max-w-[120px] truncate">
                      {stats.nextClient.serviceNames.join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-400 font-medium">Total:</span>
                    <span className="text-slate-900 font-bold text-brand-primary">R$ {stats.nextClient.totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                {stats.nextClient.notes && (
                  <p className="text-xs italic text-slate-400 bg-slate-50 p-2.5 rounded-lg border-l-2 border-brand-primary">
                    "{stats.nextClient.notes}"
                  </p>
                )}

                <button
                  onClick={() => onNavigate('agenda')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-brand-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 transition cursor-pointer"
                >
                  Gerenciar na Agenda <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <div className="h-10 w-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Calendar className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Nenhum atendimento confirmado para o resto do dia.
                </p>
                <button
                  onClick={onOpenNewAppointment}
                  className="inline-flex items-center gap-1 text-brand-primary hover:underline text-xs font-semibold cursor-pointer"
                >
                  Agendar agora <Plus className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* SaaS Operations Status Card */}
          <div className="bg-indigo-950 p-5 rounded-xl text-white shadow-sm">
            <h3 className="text-xs font-bold tracking-widest uppercase text-indigo-300 mb-4">
              STATUS DA ASSINATURA
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-indigo-200">Plano:</span>
                <span className="font-semibold text-amber-400 flex items-center gap-1">Pro Mensal</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-indigo-200">Próxima fatura:</span>
                <span className="font-semibold text-white">05/08/2026</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-indigo-200">Agendamentos Online:</span>
                <span className="font-semibold text-emerald-400">Ativado (Ilimitado)</span>
              </div>
              <div className="pt-2 border-t border-indigo-800">
                <button
                  onClick={() => onNavigate('configuracoes')}
                  className="w-full py-1.5 bg-indigo-900 hover:bg-indigo-800 rounded-lg text-[10px] font-bold text-center transition cursor-pointer"
                >
                  CONFIGURAR INTEGRADORES
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to add minutes to HH:MM time string
function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}
