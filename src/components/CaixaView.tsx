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
  Clock,
  Edit2,
  Package
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
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showProductFormModal, setShowProductFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Product Form
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodStock, setProdStock] = useState(0);

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

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdPrice(0);
    setProdStock(0);
    setShowProductFormModal(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdPrice(p.price);
    setProdStock(p.stock);
    setShowProductFormModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || prodPrice < 0 || prodStock < 0) {
      showToast('Preencha os dados do produto corretamente.', 'error');
      return;
    }

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, { name: prodName, price: prodPrice, stock: prodStock });
      } else {
        await api.createProduct({ name: prodName, price: prodPrice, stock: prodStock });
      }
      setShowProductFormModal(false);
      loadData();
    } catch (err) {
      showToast('Erro ao salvar produto.', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const confirmed = await confirmDialog('Deseja excluir permanentemente este produto?', {
      danger: true,
      confirmLabel: 'Excluir',
    });
    if (confirmed) {
      try {
        await api.deleteProduct(id);
        loadData();
      } catch (err) {
        showToast('Erro ao excluir produto.', 'error');
      }
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
        <div className="bg-card p-5 rounded-xl border border-ink/10 shadow-sm">
          <div className="flex justify-between text-ink-dim text-xs font-semibold tracking-wider">
            <span>ENTRADAS (MÊS)</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold text-emerald-600">R$ {totalIncomesMonth.toFixed(2)}</span>
            <p className="text-[10px] text-ink-dim mt-1">Total acumulado em {currentMonthName}</p>
          </div>
        </div>

        {/* Saídas do Mês */}
        <div className="bg-card p-5 rounded-xl border border-ink/10 shadow-sm">
          <div className="flex justify-between text-ink-dim text-xs font-semibold tracking-wider">
            <span>SAÍDAS (MÊS)</span>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold text-red-600">R$ {totalExpensesMonth.toFixed(2)}</span>
            <p className="text-[10px] text-ink-dim mt-1">Aluguel, contas e comissões</p>
          </div>
        </div>

        {/* Saldo Líquido do Mês */}
        <div className="bg-card p-5 rounded-xl border border-ink/10 shadow-sm">
          <div className="flex justify-between text-ink-dim text-xs font-semibold tracking-wider">
            <span>SALDO LÍQUIDO</span>
            <DollarSign className="h-4 w-4 text-ink-dim" />
          </div>
          <div className="mt-4">
            <span className={`text-2xl font-extrabold ${netBalanceMonth >= 0 ? 'text-ink' : 'text-red-700'}`}>
              R$ {netBalanceMonth.toFixed(2)}
            </span>
            <p className="text-[10px] text-ink-dim mt-1">Resultado de {currentMonthLabel}</p>
          </div>
        </div>

        {/* Saldo de Hoje */}
        <div className="bg-rail p-5 rounded-[18px_6px_18px_6px] text-paper shadow-sm">
          <div className="flex justify-between text-paper/50 text-xs font-semibold tracking-wider">
            <span className="text-paper/60">SALDO DO DIA</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold">R$ {netBalanceToday.toFixed(2)}</span>
            <div className="flex justify-between text-[10px] text-paper/50 mt-1">
              <span>Entradas: +R${totalIncomesToday.toFixed(2)}</span>
              <span>Saídas: -R${totalExpensesToday.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar / Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-ink/10 shadow-sm">
        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-ink-dim hidden sm:inline" />
          <div className="flex bg-paper border border-ink/10 rounded-lg p-0.5">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${filterType === 'all' ? 'bg-card text-ink shadow-xs' : 'text-ink-dim hover:text-ink'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${filterType === 'income' ? 'bg-card text-emerald-700 shadow-xs' : 'text-ink-dim hover:text-emerald-700'}`}
            >
              Receitas (+)
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${filterType === 'expense' ? 'bg-card text-red-700 shadow-xs' : 'text-ink-dim hover:text-red-700'}`}
            >
              Despesas (-)
            </button>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowProductsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-ink/10 text-ink-dim text-xs font-bold rounded-lg hover:bg-paper transition cursor-pointer"
          >
            <Package className="h-3.5 w-3.5 text-ink-dim" /> Gerenciar Produtos
          </button>
          <button
            onClick={() => setShowSaleModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-ink/10 text-ink-dim text-xs font-bold rounded-lg hover:bg-paper transition cursor-pointer"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-ink-dim" /> Registrar Venda
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
      <div className="bg-card rounded-xl border border-ink/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-ink/10 bg-paper flex items-center justify-between text-xs text-ink-dim font-bold uppercase tracking-wider">
          <span>EXTRATO DE FLUXO DE CAIXA</span>
          <span className="text-ink-dim">{filteredTransactions.length} lançamentos</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-20 text-center text-ink-dim text-sm">
            Nenhuma transação correspondente encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink/10 text-sm">
              <thead className="bg-paper text-xs text-ink-dim font-semibold uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Data</th>
                  <th className="px-6 py-3 text-left">Descrição</th>
                  <th className="px-6 py-3 text-left">Categoria</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 text-ink-dim font-medium">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-paper transition">
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
                        <span className="text-ink text-sm font-semibold">{tx.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-ink-dim">
                      <span className="px-2 py-1 bg-paper-dim rounded text-ink-dim font-bold uppercase tracking-wider text-[9px]">
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
                        <span className="text-[10px] text-ink-dim italic font-bold">Auto-atendimento</span>
                      ) : (
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="text-ink-dim hover:text-red-600 transition cursor-pointer"
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
            className="bg-card rounded-xl border border-ink/10 max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-ink/10 bg-paper flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Registrar Entrada/Saída</h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-ink-dim hover:text-ink font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type toggle */}
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1.5">TIPO DE OPERAÇÃO</label>
                <div className="grid grid-cols-2 gap-2 bg-paper p-1 rounded-lg border border-ink/10">
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`py-2 text-xs font-bold rounded-md transition cursor-pointer ${type === 'income' ? 'bg-card text-emerald-700 shadow-2xs' : 'text-ink-dim'}`}
                  >
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-2 text-xs font-bold rounded-md transition cursor-pointer ${type === 'expense' ? 'bg-card text-red-700 shadow-2xs' : 'text-ink-dim'}`}
                  >
                    Saída (-)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-dim mb-1">VALOR (R$)</label>
                  <input
                    type="number"
                    required
                    min={0.01}
                    step={0.01}
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-dim mb-1">DATA</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">CATEGORIA</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary bg-card"
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
                <label className="block text-xs font-bold text-ink-dim mb-1">DESCRIÇÃO DA TRANSAÇÃO</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de lâminas e capas descartáveis"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>

            <div className="bg-paper p-4 border-t border-ink/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 border border-ink/10 text-ink-dim text-xs font-bold rounded-lg hover:bg-paper-dim transition"
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
            className="bg-card rounded-xl border border-ink/10 max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-ink/10 bg-paper flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Registrar Venda de Produto</h3>
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="text-ink-dim hover:text-ink font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {products.length === 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center space-y-2">
                  <p className="text-xs text-amber-800 font-semibold">Você ainda não cadastrou nenhum produto.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaleModal(false);
                      handleOpenAddProduct();
                    }}
                    className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                  >
                    Cadastrar primeiro produto
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-ink-dim mb-1">PRODUTO</label>
                  <select
                    required
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary bg-card"
                  >
                    <option value="">-- Selecione o Produto --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                        {p.name} (R$ {p.price.toFixed(2)}) • {p.stock > 0 ? `Estoque: ${p.stock} un` : 'ESGOTADO'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {products.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-dim mb-1">QUANTIDADE</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink-dim mb-1">DATA DA VENDA</label>
                      <input
                        type="date"
                        required
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </div>
                  </div>

                  {/* Instant calculation summary */}
                  {selectedProduct && (
                    <div className="rounded-lg bg-paper border border-ink/10 p-4 flex items-center justify-between text-sm animate-fade-in">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-ink-dim" />
                        <span className="text-ink-dim">Valor Total da Venda:</span>
                      </div>
                      <span className="font-extrabold text-brand-primary text-base">
                        R$ {((products.find(p => p.id === selectedProduct)?.price || 0) * quantity).toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="bg-paper p-4 border-t border-ink/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="px-4 py-2 border border-ink/10 text-ink-dim text-xs font-bold rounded-lg hover:bg-paper-dim transition"
              >
                Cancelar
              </button>
              {products.length > 0 && (
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition shadow-xs"
                >
                  Registrar Venda
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Manage Products (list) */}
      {showProductsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-50 animate-fade-in">
          <div className="bg-card rounded-xl border border-ink/10 max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-ink/10 bg-paper flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Gerenciar Produtos</h3>
              <button
                type="button"
                onClick={() => setShowProductsModal(false)}
                className="text-ink-dim hover:text-ink font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <button
                type="button"
                onClick={handleOpenAddProduct}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Novo Produto
              </button>

              {products.length === 0 ? (
                <p className="text-center text-sm text-ink-dim py-8">Nenhum produto cadastrado ainda.</p>
              ) : (
                <div className="divide-y divide-ink/8 max-h-[340px] overflow-y-auto">
                  {products.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-ink">{p.name}</p>
                        <p className="text-xs text-ink-dim">R$ {p.price.toFixed(2)} • Estoque: {p.stock} un</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-2 bg-card border border-ink/10 text-ink-dim rounded-lg hover:bg-paper hover:text-brand-primary transition cursor-pointer"
                          title="Editar Produto"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 bg-card border border-ink/10 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
                          title="Excluir Produto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Add/Edit Product Form */}
      {showProductFormModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-start justify-center overflow-y-auto p-4 z-[60] animate-fade-in">
          <form
            onSubmit={handleSaveProduct}
            className="bg-card rounded-xl border border-ink/10 max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-ink/10 bg-paper flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button
                type="button"
                onClick={() => setShowProductFormModal(false)}
                className="text-ink-dim hover:text-ink font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-dim mb-1">NOME DO PRODUTO</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pomada Modeladora"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-dim mb-1">PREÇO (R$)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={0.01}
                    value={prodPrice || ''}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-dim mb-1">ESTOQUE (UN)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={prodStock || ''}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full border border-ink/10 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>
            </div>

            <div className="bg-paper p-4 border-t border-ink/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProductFormModal(false)}
                className="px-4 py-2 border border-ink/10 text-ink-dim text-xs font-bold rounded-lg hover:bg-paper-dim transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition shadow-xs"
              >
                Salvar Produto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
