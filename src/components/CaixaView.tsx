/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { getTodayStr } from '../lib/date';
import { useToast, useConfirm } from '../lib/ui';
import { CashFlowTransaction, Product } from '../types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PlusCircle,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Tag,
  ShoppingBag,
  Info,
  Clock
} from 'lucide-react';

interface CaixaViewProps {
  refreshTrigger: number;
  onRefresh: () => void;
  openNewExpenseDirect: boolean;
  onCloseExpenseDirect: () => void;
}

export default function CaixaView({
  refreshTrigger,
  onRefresh,
  openNewExpenseDirect,
  onCloseExpenseDirect
}: CaixaViewProps) {
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const [transactions, setTransactions] = useState<CashFlowTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Manual Transaction Form
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Outros');
  const [date, setDate] = useState(getTodayStr());

  // Product Sale Form
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [saleDate, setSaleDate] = useState(getTodayStr());

  const loadData = async () => {
    try {
      setLoading(true);
      const [txData, prodData] = await Promise.all([
        api.getCashFlow(),
        api.getProducts()
      ]);
      setTransactions(txData);
      setProducts(prodData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (openNewExpenseDirect) {
      setType('expense');
      setCategory('Outros');
      setDescription('');
      setAmount(0);
      setShowManualModal(true);
      onCloseExpenseDirect();
    }
  }, [refreshTrigger, openNewExpenseDirect]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description || !category || !date) {
      showToast('Preencha os dados da movimentação corretamente.', 'error');
      return;
    }

    try {
      await api.createTransaction({
        type,
        amount,
        description,
        category,
        date
      });
      setShowManualModal(false);
      setAmount(0);
      setDescription('');
      onRefresh();
      loadData();
    } catch (err) {
      showToast('Erro ao registrar transação.', 'error');
    }
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || quantity <= 0) {
      showToast('Selecione um produto e quantidade.', 'error');
      return;
    }

    try {
      await api.createSale({
        productId: selectedProduct,
        quantity,
        date: saleDate
      });
      setShowSaleModal(false);
      setSelectedProduct('');
      setQuantity(1);
      onRefresh();
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar venda de produto.', 'error');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const confirmed = await confirmDialog(
      'Deseja excluir esta entrada do fluxo de caixa? (Isso não altera os agendamentos já concluídos)',
      { danger: true, confirmLabel: 'Excluir' }
    );
    if (confirmed) {
      try {
        await api.deleteTransaction(id);
        onRefresh();
        loadData();
      } catch (err) {
        showToast('Erro ao excluir transação.', 'error');
      }
    }
  };

  // Financial Statistics
  const todayStr = getTodayStr();
  const currentMonthStr = todayStr.substring(0, 7); // 'YYYY-MM'
  const currentMonthName = new Date(`${todayStr}T00:00:00`).toLocaleDateString('pt-BR', { month: 'long' });
  const currentMonthLabel = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1) + '/' + todayStr.substring(0, 4);

  // Entradas do Mês
  const totalIncomesMonth = transactions
    .filter(t => t.type === 'income' && t.date.startsWith(currentMonthStr))
    .reduce((sum, t) => sum + t.amount, 0);

  // Saídas do Mês
  const totalExpensesMonth = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr))
    .reduce((sum, t) => sum + t.amount, 0);

  // Saldo Líquido do Mês
  const netBalanceMonth = totalIncomesMonth - totalExpensesMonth;

  // Entradas de Hoje
  const totalIncomesToday = transactions
    .filter(t => t.type === 'income' && t.date === todayStr)
    .reduce((sum, t) => sum + t.amount, 0);

  // Saídas de Hoje
  const totalExpensesToday = transactions
    .filter(t => t.type === 'expense' && t.date === todayStr)
    .reduce((sum, t) => sum + t.amount, 0);

  // Saldo do Dia
  const netBalanceToday = totalIncomesToday - totalExpensesToday;

  // Filter transactions for listing
  const filteredTransactions = transactions
    .filter(t => {
      if (filterType === 'all') return true;
      return t.type === filterType;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      {/* Balances Bento Grid Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entradas do Mês */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between text-slate-400 text-xs font-semibold tracking-wider">
            <span>ENTRADAS (MÊS)</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold text-emerald-600">R$ {totalIncomesMonth.toFixed(2)}</span>
            <p className="text-[10px] text-slate-400 mt-1">Total acumulado em {currentMonthName}</p>
          </div>
        </div>

        {/* Saídas do Mês */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between text-slate-400 text-xs font-semibold tracking-wider">
            <span>SAÍDAS (MÊS)</span>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold text-red-600">R$ {totalExpensesMonth.toFixed(2)}</span>
            <p className="text-[10px] text-slate-400 mt-1">Aluguel, contas e comissões</p>
          </div>
        </div>

        {/* Saldo Líquido do Mês */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between text-slate-400 text-xs font-semibold tracking-wider">
            <span>SALDO LÍQUIDO</span>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <span className={`text-2xl font-extrabold ${netBalanceMonth >= 0 ? 'text-slate-900' : 'text-red-700'}`}>
              R$ {netBalanceMonth.toFixed(2)}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Resultado de {currentMonthLabel}</p>
          </div>
        </div>

        {/* Saldo de Hoje */}
        <div className="bg-slate-900 p-5 rounded-xl text-white shadow-sm">
          <div className="flex justify-between text-slate-400 text-xs font-semibold tracking-wider">
            <span className="text-slate-300">SALDO DO DIA</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold">R$ {netBalanceToday.toFixed(2)}</span>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Incomes: +R${totalIncomesToday}</span>
              <span>Expenses: -R${totalExpensesToday}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar / Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:inline" />
          <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${filterType === 'income' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-emerald-700'}`}
            >
              Receitas (+)
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${filterType === 'expense' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-500 hover:text-red-700'}`}
            >
              Despesas (-)
            </button>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSaleModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-slate-400" /> Registrar Venda
          </button>
          <button
            onClick={() => {
              setType('expense');
              setCategory('Outros');
              setDescription('');
              setAmount(0);
              setShowManualModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Lançamento Manual
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
          <span>EXTRATO DE FLUXO DE CAIXA</span>
          <span className="text-slate-600">{filteredTransactions.length} lançamentos</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Nenhuma transação correspondente encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Data</th>
                  <th className="px-6 py-3 text-left">Descrição</th>
                  <th className="px-6 py-3 text-left">Categoria</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {tx.date.split('-').reverse().join('/')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {tx.type === 'income' ? (
                          <div className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                            +
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">
                            -
                          </div>
                        )}
                        <span className="text-slate-900 text-sm font-semibold">{tx.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      <span className="px-2 py-1 bg-slate-100 rounded text-slate-600 font-bold uppercase tracking-wider text-[9px]">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-extrabold text-sm">
                      <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}>
                        {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {tx.appointmentId ? (
                        <span className="text-[10px] text-slate-400 italic font-bold">Auto-atendimento</span>
                      ) : (
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Remover Registro"
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Add Manual Transaction */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleCreateTransaction}
            className="bg-white rounded-xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Registrar Entrada/Saída</h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-950 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">TIPO DE OPERAÇÃO</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`py-2 text-xs font-bold rounded-md transition cursor-pointer ${type === 'income' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-400'}`}
                  >
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-2 text-xs font-bold rounded-md transition cursor-pointer ${type === 'expense' ? 'bg-white text-red-700 shadow-2xs' : 'text-slate-400'}`}
                  >
                    Saída (-)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">VALOR (R$)</label>
                  <input
                    type="number"
                    required
                    min={0.01}
                    step={0.01}
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">DATA</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">CATEGORIA</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white"
                >
                  {type === 'income' ? (
                    <>
                      <option value="Atendimento">Atendimento</option>
                      <option value="Venda de Produto">Venda de Produto</option>
                      <option value="Outros">Outros Ingressos</option>
                    </>
                  ) : (
                    <>
                      <option value="Aluguel">Aluguel do Salão</option>
                      <option value="Energia">Energia Elétrica</option>
                      <option value="Internet">Internet/Sistemas</option>
                      <option value="Equipamentos">Acessórios e Ferramentas</option>
                      <option value="Produtos">Produtos/Cosméticos</option>
                      <option value="Funcionários">Comissão e Salários</option>
                      <option value="Outros">Outras Despesas</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">DESCRIÇÃO DA TRANSAÇÃO</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de lâminas e capas descartáveis"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition shadow-xs"
              >
                Salvar Lançamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Register Product Sale */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleCreateSale}
            className="bg-white rounded-xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Registrar Venda de Produto</h3>
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="text-slate-400 hover:text-slate-950 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">PRODUTO</label>
                <select
                  required
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white"
                >
                  <option value="">-- Selecione o Produto --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                      {p.name} (R$ {p.price.toFixed(2)}) • {p.stock > 0 ? `Estoque: ${p.stock} un` : 'ESGOTADO'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">QUANTIDADE</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">DATA DA VENDA</label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Instant calculation summary */}
              {selectedProduct && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 flex items-center justify-between text-sm animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500">Valor Total da Venda:</span>
                  </div>
                  <span className="font-extrabold text-brand-primary text-base">
                    R$ {((products.find(p => p.id === selectedProduct)?.price || 0) * quantity).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition shadow-xs"
              >
                Registrar Venda
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
