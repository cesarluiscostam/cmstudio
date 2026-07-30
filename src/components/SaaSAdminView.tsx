import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../lib/ui';
import { Company } from '../types';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Globe,
  Settings,
  X,
  Save,
  Palette,
  Sparkles,
  Search,
  CheckCircle,
  HelpCircle,
  Phone,
  Layers
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SaaSAdminViewProps {
  onRefresh: () => void;
  refreshTrigger: number;
}

export default function SaaSAdminView({ onRefresh, refreshTrigger }: SaaSAdminViewProps) {
  const showToast = useToast();
  const [data, setData] = useState<{
    companies: any[];
    totalSaaSEarnings: number;
    companiesCount: number;
    monthName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search/Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [teamModalCompany, setTeamModalCompany] = useState<any | null>(null);
  const [resetResult, setResetResult] = useState<{ userId: string; tempPassword: string } | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBusinessType, setFormBusinessType] = useState('barbershop');
  const [formPrimaryColor, setFormPrimaryColor] = useState('#4f46e5');
  const [formSecondaryColor, setFormSecondaryColor] = useState('#312e81');
  const [formSubscriptionFee, setFormSubscriptionFee] = useState('149.90');
  const [formManagerName, setFormManagerName] = useState('');
  const [formManagerEmail, setFormManagerEmail] = useState('');
  const [formManagerPassword, setFormManagerPassword] = useState('');

  const loadSaaSDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getSaaSDashboard();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do painel SaaS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaaSDashboard();
  }, [refreshTrigger]);

  const handleOpenCreateModal = () => {
    setEditingCompany(null);
    setFormName('');
    setFormSlug('');
    setFormPhone('');
    setFormBusinessType('barbershop');
    setFormPrimaryColor('#4f46e5');
    setFormSecondaryColor('#312e81');
    setFormSubscriptionFee('149.90');
    setFormManagerName('');
    setFormManagerEmail('');
    setFormManagerPassword('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comp: any) => {
    setEditingCompany(comp);
    setFormName(comp.name);
    setFormSlug(comp.slug);
    setFormPhone(comp.phone || '');
    setFormBusinessType(comp.businessType || 'barbershop');
    setFormPrimaryColor(comp.primaryColor || '#4f46e5');
    setFormSecondaryColor(comp.secondaryColor || '#312e81');
    setFormSubscriptionFee(String(comp.subscriptionFee || '149.90'));
    setFormManagerName(comp.managerName || '');
    setFormManagerEmail(comp.managerEmail || '');
    setFormManagerPassword('');
    setIsModalOpen(true);
  };

  const handleSlugify = (val: string) => {
    setFormName(val);
    if (!editingCompany) {
      const slug = val
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setFormSlug(slug);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        // Update company metadata
        await api.updateSaaSCompany(editingCompany.id, {
          name: formName,
          slug: formSlug,
          phone: formPhone,
          businessType: formBusinessType,
          primaryColor: formPrimaryColor,
          secondaryColor: formSecondaryColor,
          subscriptionFee: Number(formSubscriptionFee)
        });
        showToast('Empresa parceira atualizada com sucesso!');
      } else {
        // Create brand new company + manager account + initial setup
        await api.createSaaSCompany({
          name: formName,
          slug: formSlug,
          phone: formPhone,
          businessType: formBusinessType,
          primaryColor: formPrimaryColor,
          secondaryColor: formSecondaryColor,
          subscriptionFee: Number(formSubscriptionFee),
          managerName: formManagerName,
          managerEmail: formManagerEmail,
          managerPassword: formManagerPassword
        });
        showToast('Nova empresa parceira e administrador criados com sucesso!');
      }
      setIsModalOpen(false);
      loadSaaSDashboard();
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar empresa parceira', 'error');
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const res = await api.resetUserPassword(userId);
      setResetResult({ userId, tempPassword: res.tempPassword });
    } catch (err: any) {
      showToast(err.message || 'Erro ao redefinir senha do usuário', 'error');
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmName(name);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      await api.deleteSaaSCompany(deleteConfirmId);
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
      loadSaaSDashboard();
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao deletar empresa', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Processando métricas SaaS multitenant...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-xl max-w-2xl mx-auto text-center space-y-4">
        <p className="text-sm font-bold text-red-700">{error || 'Painel SaaS não carregado'}</p>
        <button onClick={loadSaaSDashboard} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Filter companies based on search input and business type selection
  const filteredCompanies = data.companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.managerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || c.businessType === filterType;
    return matchesSearch && matchesType;
  });

  // Calculate some analytics
  const totalPartnerClients = data.companies.reduce((sum, c) => sum + (c.clientsCount || 0), 0);
  const totalPartnerAppointments = data.companies.reduce((sum, c) => sum + (c.appointmentsCount || 0), 0);
  
  // Custom colors for different business sectors
  const getSectorBadgeColor = (type: string) => {
    switch (type) {
      case 'beauty_salon': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'manicure': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'barbershop': default: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    }
  };

  const getSectorLabel = (type: string) => {
    switch (type) {
      case 'beauty_salon': return 'Salão de Beleza';
      case 'manicure': return 'Especialista Manicure';
      case 'barbershop': default: return 'Barbearia';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 p-6 md:p-8 rounded-2xl text-white shadow-lg border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 text-[10px] font-bold tracking-wider rounded uppercase">
              Acesso Master Administrador
            </span>
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-indigo-400" /> Painel Master SaaS
          </h1>
          <p className="text-sm text-slate-400">
            Gerenciamento global de licenciamentos, faturamento recorrente, personalizações e fluxo de inquilinos (tenants).
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-4.5 w-4.5" /> Adicionar Novo Cliente
        </button>
      </div>

      {/* Global SaaS Bento Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Earnings Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">FATURAMENTO RECORRENTE (SAAS)</span>
            <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-display font-black text-slate-900">
              R$ {data.totalSaaSEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> Faturamento mensal garantido
            </p>
          </div>
        </div>

        {/* Partners Count */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SALÕES / CLÍNICAS ATIVOS</span>
            <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Building2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-display font-black text-slate-900">{data.companiesCount}</p>
            <p className="text-[11px] text-indigo-600 font-bold mt-1">
              Barbearias, manicure & estética
            </p>
          </div>
        </div>

        {/* Clients Serviced */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CLIENTES FINAIS CADASTRADOS</span>
            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-display font-black text-slate-900">{totalPartnerClients}</p>
            <p className="text-[11px] text-blue-600 font-bold mt-1">
              Base acumulada na plataforma
            </p>
          </div>
        </div>

        {/* Appointments Made */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AGENDAMENTOS TOTAIS</span>
            <div className="h-8 w-8 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center">
              <Calendar className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-display font-black text-slate-900">{totalPartnerAppointments}</p>
            <p className="text-[11px] text-pink-600 font-bold mt-1">
              Agendamentos intermediados online
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Chart Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
            <TrendingUp className="h-5 w-5 text-indigo-600" /> Faturamento de Serviços por Empresa Parceira (Mês Atual)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gráfico comparativo de faturamento (vendas de produtos + agendamentos concluídos) de cada inquilino da plataforma.
          </p>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.companies} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `R$ ${val}`} />
              <Tooltip
                formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento Mensal']}
                contentStyle={{ background: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="monthlyRevenue" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={50}>
                {data.companies.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.primaryColor || '#4f46e5'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Subscriptions list & controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Filters header */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="h-5 w-5 text-slate-500" /> Carteira de Clientes SaaS (Inquilinos)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Gerencie os acessos, mensalidades e verifique as estatísticas individuais.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600 transition"
              />
            </div>

            {/* Business Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs focus:outline-none text-slate-600 font-medium"
            >
              <option value="all">Todos os setores</option>
              <option value="barbershop">Barbearias</option>
              <option value="beauty_salon">Salões de Beleza</option>
              <option value="manicure">Manicure</option>
            </select>
          </div>
        </div>

        {/* Company Table list */}
        <div className="overflow-x-auto">
          {filteredCompanies.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-400">Nenhuma empresa parceira cadastrada nesta categoria.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Empresa & Tipo</th>
                  <th className="py-4 px-6">Identidade & Cores</th>
                  <th className="py-4 px-6">Gerente de Contato</th>
                  <th className="py-4 px-6">Base Cliente/Agend.</th>
                  <th className="py-4 px-6">Faturamento Estimado</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-50/50 transition">
                    {/* Name, Slug & type of business */}
                    <td className="py-4.5 px-6">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 flex items-center gap-2">
                          {comp.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            /{comp.slug}
                          </span>
                          <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-md ${getSectorBadgeColor(comp.businessType)}`}>
                            {getSectorLabel(comp.businessType)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Branding Colors indicator */}
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded border border-slate-200" style={{ backgroundColor: comp.primaryColor || '#4f46e5' }} title="Cor Primária" />
                        <div className="h-5 w-5 rounded border border-slate-200" style={{ backgroundColor: comp.secondaryColor || '#312e81' }} title="Cor Secundária" />
                        <span className="text-xs text-slate-500 font-mono">{comp.primaryColor || '#4f46e5'}</span>
                      </div>
                    </td>

                    {/* Manager name & contact details */}
                    <td className="py-4.5 px-6">
                      <div className="space-y-0.5 text-xs">
                        <p className="font-bold text-slate-700">{comp.managerName}</p>
                        <p className="text-slate-400 font-medium">{comp.managerEmail}</p>
                        {comp.phone && (
                          <p className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                            <Phone className="h-3 w-3" /> {comp.phone}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Customer Base & Appt volume */}
                    <td className="py-4.5 px-6">
                      <div className="space-y-0.5 text-xs text-slate-600 font-medium">
                        <p>● <span className="font-bold text-slate-900">{comp.clientsCount || 0}</span> clientes cadastrados</p>
                        <p>● <span className="font-bold text-slate-900">{comp.appointmentsCount || 0}</span> horários na agenda</p>
                      </div>
                    </td>

                    {/* Monthly business billing & licensing cost */}
                    <td className="py-4.5 px-6">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900">
                          Serviços: R$ {(comp.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md inline-block">
                          Licença: R$ {(comp.subscriptionFee || 149.90).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                        </p>
                      </div>
                    </td>

                    {/* Controls Actions */}
                    <td className="py-4.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setTeamModalCompany(comp); setResetResult(null); }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Ver equipe / resetar senha"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(comp)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Editar empresa"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(comp.id, comp.name)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Remover permanentemente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: Create / Edit Partner Business */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Palette className="h-5 w-5 text-indigo-600" />
                  {editingCompany ? 'Editar Empresa Parceira' : 'Cadastrar Nova Empresa Parceira'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingCompany ? 'Edite os parâmetros globais e faturamento desta assinatura.' : 'Informe os dados da empresa e crie o usuário do gerente administrativo.'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-150 rounded-xl transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Core Business Data Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                  1. DADOS CADASTRAIS DA EMPRESA
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">NOME DA EMPRESA / SALÃO *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Studio Bella Estética"
                      value={formName}
                      onChange={(e) => handleSlugify(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">LINK DE ACESSO (SLUG URL) *</label>
                    <div className="flex items-center">
                      <span className="bg-slate-50 text-slate-400 border border-r-0 border-slate-200 p-2.5 text-xs font-mono rounded-l-lg">
                        /agendar/
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="studio-bella"
                        value={formSlug}
                        onChange={(e) => setFormSlug(e.target.value)}
                        className="w-full border border-slate-200 p-2.5 rounded-r-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">TELEFONE COMERCIAL</label>
                    <input
                      type="text"
                      placeholder="Ex: (11) 98888-1111"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">SETOR DO NEGÓCIO *</label>
                    <select
                      value={formBusinessType}
                      onChange={(e) => setFormBusinessType(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white text-slate-700"
                    >
                      <option value="barbershop">Barbearia</option>
                      <option value="beauty_salon">Salão de Beleza / Estética</option>
                      <option value="manicure">Especialista em Unhas / Manicure</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Branding Customizer Colors */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> 2. IDENTIDADE VISUAL & ASSINATURA
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">COR PRIMÁRIA (HEX)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={formPrimaryColor}
                        onChange={(e) => setFormPrimaryColor(e.target.value)}
                        className="h-8 w-10 border border-slate-200 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formPrimaryColor}
                        onChange={(e) => setFormPrimaryColor(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-md text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">COR SECUNDÁRIA (HEX)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={formSecondaryColor}
                        onChange={(e) => setFormSecondaryColor(e.target.value)}
                        className="h-8 w-10 border border-slate-200 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formSecondaryColor}
                        onChange={(e) => setFormSecondaryColor(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-md text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">CUSTO DA LICENÇA (R$)*</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      placeholder="149.90"
                      value={formSubscriptionFee}
                      onChange={(e) => setFormSubscriptionFee(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Manager User Account Setup */}
              {!editingCompany && (
                <div className="space-y-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1 pb-1">
                    <Users className="h-3.5 w-3.5" /> 3. CRIAÇÃO DO USUÁRIO MASTER (GERENTE)
                  </h4>
                  <p className="text-[11px] text-indigo-700 font-medium">
                    O gerente poderá realizar login usando estas credenciais e precisará redefinir a senha temporária no primeiro acesso.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-indigo-950 mb-1">NOME DO GERENTE / ADMINISTRADOR *</label>
                      <input
                        type="text"
                        required={!editingCompany}
                        placeholder="Ex: Amanda Santos"
                        value={formManagerName}
                        onChange={(e) => setFormManagerName(e.target.value)}
                        className="w-full border border-indigo-200 p-2.5 rounded-lg text-xs font-semibold focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-indigo-950 mb-1">EMAIL DE LOGIN DO GERENTE *</label>
                      <input
                        type="email"
                        required={!editingCompany}
                        placeholder="gerente@empresa.com"
                        value={formManagerEmail}
                        onChange={(e) => setFormManagerEmail(e.target.value)}
                        className="w-full border border-indigo-200 p-2.5 rounded-lg text-xs font-semibold focus:outline-none bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-indigo-950 mb-1">SENHA TEMPORÁRIA *</label>
                      <input
                        type="text"
                        required={!editingCompany}
                        placeholder="Ex: Mudar123!"
                        value={formManagerPassword}
                        onChange={(e) => setFormManagerPassword(e.target.value)}
                        className="w-full border border-indigo-200 p-2.5 rounded-lg text-xs font-semibold focus:outline-none bg-white font-mono"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-indigo-500 font-bold mt-2">
                    * NOTA: A senha temporária cadastrada aqui deve ser fornecida ao cliente parceiro para que ele realize o primeiro acesso com segurança.
                  </p>
                </div>
              )}

              {/* Modal footer controls */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Save className="h-4 w-4" /> Salvar Cadastro
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Team & Password Reset */}
      {teamModalCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Equipe — {teamModalCompany.name}</h3>
                <p className="text-xs text-slate-400">{(teamModalCompany.users || []).length} usuário(s) com acesso</p>
              </div>
              <button
                onClick={() => { setTeamModalCompany(null); setResetResult(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-150 rounded-xl transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[420px] overflow-y-auto">
              {(teamModalCompany.users || []).length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">Nenhum usuário encontrado para esta empresa.</p>
              ) : (
                (teamModalCompany.users || []).map((u: any) => (
                  <div key={u.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{u.name}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                          {u.role}
                        </span>
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Resetar Senha
                        </button>
                      </div>
                    </div>
                    {resetResult?.userId === u.id && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs space-y-1">
                        <p className="text-emerald-800 font-semibold">Nova senha temporária gerada:</p>
                        <p className="font-mono text-sm text-emerald-950 bg-white px-2 py-1 rounded border border-emerald-100 inline-block">
                          {resetResult.tempPassword}
                        </p>
                        <p className="text-emerald-700">
                          Repasse essa senha ao usuário por um canal seguro. Ele será obrigado a trocá-la no próximo login.
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Partner Business Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-55 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col p-6 space-y-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Excluir Empresa Parceira</h3>
              <p className="text-xs text-slate-500">
                ATENÇÃO: Essa ação é irreversível.
              </p>
            </div>
            
            <p className="text-sm text-slate-600 text-center">
              Você deseja mesmo excluir permanentemente a empresa <strong className="text-slate-950 font-bold">"{deleteConfirmName}"</strong>? Isso removerá permanentemente toda a agenda, configurações, equipe, histórico de caixa e os usuários associados a este salão/barbearia.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmId(null);
                  setDeleteConfirmName('');
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-xs font-bold cursor-pointer transition flex-1 flex items-center justify-center gap-1.5 shadow"
              >
                {isDeleting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
