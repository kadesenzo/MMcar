
import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, ArrowUpCircle, ArrowDownCircle, PieChart as PieChartIcon, 
  Plus, Search, X, Trash2, Edit3, Loader2, Save, TrendingUp, Filter,
  Car, Wrench, Package, Award, FileSpreadsheet
} from 'lucide-react';
import { FinancialTransaction, TransactionType, PaymentMethod, UserSession, ServiceOrder } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';

const Financial: React.FC<{ session?: UserSession; syncData?: (key: string, data: any) => Promise<void> }> = ({ session, syncData }) => {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    description: '',
    category: 'Diversos',
    amount: '',
    method: PaymentMethod.PIX,
    type: TransactionType.EXPENSE,
    date: new Date().toISOString().split('T')[0]
  });

  const categories = [
    'Serviços (Mão de Obra)', 'Peças (Venda)', 'Diagnóstico Scanner', 'Revisão Preventiva',
    'Compra de Peças', 'Salários & Comissões', 'Aluguel', 'Energia & Água', 
    'Internet & Telefonia', 'Impostos & Taxas', 'Marketing & Tráfego', 'Ferramentas & Equipamentos', 'Diversos'
  ];

  useEffect(() => {
    if (session) {
      const load = () => {
        const savedTrans = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_transactions`) || '[]');
        const savedOrders = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_orders`) || '[]');
        setTransactions(savedTrans);
        setOrders(savedOrders);
      };
      load();
      window.addEventListener('kaen_storage_updated', load);
      return () => window.removeEventListener('kaen_storage_updated', load);
    }
  }, [session]);

  const handleSave = async () => {
    if (!form.description || !form.amount || !session || !syncData) {
        alert("Preencha Descrição e Valor.");
        return;
    }

    let updated: FinancialTransaction[];
    if (editingId) {
      updated = transactions.map(t => t.id === editingId ? {
        ...t,
        description: form.description,
        category: form.category,
        amount: parseFloat(form.amount),
        method: form.method,
        type: form.type,
        date: new Date(form.date).toISOString()
      } : t);
    } else {
      const newTransaction: FinancialTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: form.type,
        category: form.category,
        amount: parseFloat(form.amount),
        method: form.method,
        description: form.description,
        date: new Date(form.date).toISOString()
      };
      updated = [...transactions, newTransaction];
    }

    setTransactions(updated);
    if (syncData) {
      await syncData('transactions', updated);
    }
    setShowModal(false);
    setEditingId(null);
    setForm({ 
        description: '', 
        category: 'Diversos', 
        amount: '', 
        method: PaymentMethod.PIX, 
        type: TransactionType.EXPENSE, 
        date: new Date().toISOString().split('T')[0] 
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este registro financeiro?")) return;
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    if (syncData) {
      await syncData('transactions', updated);
    }
  };

  const handleEdit = (t: FinancialTransaction) => {
    setEditingId(t.id);
    setForm({
      description: t.description,
      category: t.category,
      amount: t.amount.toString(),
      method: t.method,
      type: t.type,
      date: new Date(t.date).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const indicators = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Entradas directas de OS
    const osRevenue = orders.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
    const osLabor = orders.reduce((acc, curr) => acc + (curr.laborValue || 0), 0);
    const osParts = osRevenue - osLabor;

    // Transações manuais
    const transIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((a, b) => a + b.amount, 0);
    const transExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((a, b) => a + b.amount, 0);
    
    // Total Faturamento
    const totalRevenue = osRevenue > 0 ? (osRevenue + transIncome) : (transIncome || 0);
    const totalExpenses = transExpense;
    const netProfit = totalRevenue - totalExpenses;
    
    // Total Carros Atendidos
    const totalCarsServed = orders.length;

    // Ticket Médio
    const averageTicket = totalCarsServed > 0 ? (totalRevenue / totalCarsServed) : totalRevenue;

    // Margem de Lucro (%)
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

    // Serviço Mais Vendido
    const serviceCounts: Record<string, number> = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        serviceCounts[item.description] = (serviceCounts[item.description] || 0) + (item.quantity || 1);
      });
    });
    let topService = 'Revisão & Diagnóstico';
    let topCount = 0;
    Object.entries(serviceCounts).forEach(([name, count]) => {
      if (count > topCount) {
        topCount = count;
        topService = name;
      }
    });

    const dailyIncome = transactions.filter(t => t.type === TransactionType.INCOME && t.date.split('T')[0] === todayStr).reduce((a, b) => a + b.amount, 0)
      + orders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr)).reduce((a, b) => a + (b.totalValue || 0), 0);

    const chartData = [
      { name: 'Faturamento', value: totalRevenue, fill: '#10B981' },
      { name: 'Despesas', value: totalExpenses, fill: '#FF2D55' },
      { name: 'Lucro Líquido', value: Math.max(0, netProfit), fill: '#3B82F6' }
    ];

    const categoryDataMap = transactions.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.keys(categoryDataMap).map(cat => ({
        name: cat,
        value: categoryDataMap[cat]
    }));

    return { 
      totalRevenue, 
      totalExpenses, 
      netProfit, 
      totalCarsServed, 
      averageTicket, 
      profitMargin, 
      topService, 
      dailyIncome, 
      chartData, 
      categoryData,
      osLabor,
      osParts
    };
  }, [transactions, orders]);

  const filtered = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-36 px-4 md:px-8 max-w-7xl mx-auto text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter">
            GESTÃO FINANCEIRA & <span className="text-[#FF2D55]">DRE KAEN</span>
          </h1>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.25em] italic mt-1.5">
            INDICADORES ESTRATÉGICOS • FLUXO DE CAIXA • CONTROLE DE LUCRO
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#FF2D55] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-[#FF2D55]/90 active:scale-95 transition-all shadow-[#FF2D55]/30 italic"
        >
          <Plus size={18} /> Lançar Despesa / Entrada
        </button>
      </div>

      {/* 6 INDICADORES CHAVE DA KAEN AUTO MECÂNICA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card p-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/5">
           <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1 italic">1. Faturamento Total</p>
           <p className="text-xl md:text-2xl font-black text-emerald-400 italic truncate">R$ {indicators.totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
           <span className="text-[8px] font-bold text-zinc-500 uppercase">Receita Bruta</span>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-blue-500/20 bg-blue-500/5">
           <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1 italic">2. Lucro Líquido</p>
           <p className={`text-xl md:text-2xl font-black italic truncate ${indicators.netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
             R$ {indicators.netProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
           </p>
           <span className="text-[8px] font-bold text-zinc-500 uppercase">Receita - Despesas</span>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-purple-500/20 bg-purple-500/5">
           <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1 italic">3. Ticket Médio</p>
           <p className="text-xl md:text-2xl font-black text-purple-400 italic truncate">R$ {indicators.averageTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
           <span className="text-[8px] font-bold text-zinc-500 uppercase">Média por Carro</span>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-amber-500/20 bg-amber-500/5">
           <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1 italic">4. Margem de Lucro</p>
           <p className="text-xl md:text-2xl font-black text-amber-400 italic">{indicators.profitMargin.toFixed(1)}%</p>
           <span className="text-[8px] font-bold text-zinc-500 uppercase">Eficiência Operacional</span>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-white/10 bg-black/50">
           <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1 italic">5. Carros Atendidos</p>
           <p className="text-xl md:text-2xl font-black text-white italic">{indicators.totalCarsServed}</p>
           <span className="text-[8px] font-bold text-zinc-500 uppercase">Ordens de Serviço</span>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-[#FF2D55]/20 bg-[#FF2D55]/5">
           <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1 italic">6. Serviço Líder</p>
           <p className="text-sm font-black text-[#FF2D55] italic truncate mt-1" title={indicators.topService}>{indicators.topService}</p>
           <span className="text-[8px] font-bold text-zinc-500 uppercase">Mais Vendido</span>
        </div>
      </div>

      {/* DRE SINTÉTICO & GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* DRE Demonstrativo */}
        <div className="lg:col-span-5 glass-card p-8 rounded-[3rem] border border-white/10 space-y-4 bg-zinc-950/40">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-[#FF2D55]"/> DRE SINTÉTICO DA OFICINA
            </h3>
            <span className="text-[8px] font-mono bg-white/5 text-zinc-400 px-2 py-0.5 rounded">MÊS ATUAL</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-zinc-300 py-1">
              <span className="font-bold">(+) Mão de Obra / Serviços</span>
              <span className="font-mono text-emerald-400 font-bold">R$ {indicators.osLabor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-300 py-1">
              <span className="font-bold">(+) Venda de Peças & Insumos</span>
              <span className="font-mono text-emerald-400 font-bold">R$ {indicators.osParts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-white font-black py-2 border-y border-white/5 bg-white/5 px-3 rounded-xl">
              <span>(=) RECEITA BRUTA TOTAL</span>
              <span className="font-mono text-emerald-400">R$ {indicators.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400 py-1">
              <span>(-) Despesas Operacionais / Peças</span>
              <span className="font-mono text-[#FF2D55] font-bold">- R$ {indicators.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-white font-black py-3 border-t border-white/10 text-sm">
              <span className="text-blue-400">(=) RESULTADO LÍQUIDO</span>
              <span className={`font-mono ${indicators.netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                R$ {indicators.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Gráfico Comparativo */}
        <div className="lg:col-span-7 glass-card p-8 rounded-[3rem] border border-white/10 shadow-xl h-[340px] bg-zinc-950/40">
           <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 italic text-zinc-400 flex items-center gap-2">
             <TrendingUp size={14} className="text-emerald-400"/> Faturamento vs Despesas vs Lucro
           </h3>
           <ResponsiveContainer width="100%" height="85%">
             <BarChart data={indicators.chartData}>
               <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
               <XAxis dataKey="name" stroke="#71717A" fontSize={11} axisLine={false} tickLine={false} />
               <YAxis hide />
               <Tooltip 
                contentStyle={{ backgroundColor: '#050505', border: '1px solid #27272A', borderRadius: '12px' }}
                itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
               />
               <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                 {indicators.chartData.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={entry.fill} />
                 ))}
               </Bar>
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* HISTÓRICO DE LANÇAMENTOS */}
      <div className="glass-card border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden bg-zinc-950/40">
        <div className="p-6 border-b border-white/5 bg-zinc-950/30 flex items-center gap-4">
           <Search size={20} className="text-zinc-600" />
           <input 
             type="text" 
             value={searchTerm} 
             onChange={(e)=>setSearchTerm(e.target.value)} 
             placeholder="PESQUISAR HISTÓRICO (DESCRIÇÃO OU CATEGORIA)..." 
             className="bg-transparent border-none text-xs font-black uppercase w-full outline-none focus:ring-0 text-white italic tracking-widest placeholder-zinc-700"
           />
        </div>

        <div className="divide-y divide-white/5">
           {filtered.length === 0 ? (
             <div className="py-12 text-center text-zinc-600 text-xs font-black uppercase tracking-widest">
               Nenhum lançamento financeiro manual cadastrado.
             </div>
           ) : (
             filtered.map(t => (
               <div key={t.id} className="p-6 flex items-center justify-between gap-6 hover:bg-white/5 transition-all group">
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${t.type === TransactionType.INCOME ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[#FF2D55]/10 border-[#FF2D55]/20 text-[#FF2D55]'}`}>
                        {t.type === TransactionType.INCOME ? <ArrowUpCircle size={22}/> : <ArrowDownCircle size={22}/>}
                     </div>
                     <div>
                        <p className="text-sm font-black text-white uppercase italic tracking-tight truncate max-w-[280px]">{t.description}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1 italic">
                          {new Date(t.date).toLocaleDateString('pt-BR')} • {t.category}
                        </p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                     <div className="text-right">
                        <p className={`text-lg font-black italic ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-[#FF2D55]'}`}>
                          {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest italic">{t.method}</p>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={()=>handleEdit(t)} className="p-3 bg-white/5 text-zinc-400 hover:text-white rounded-xl border border-white/10 shadow-md transition-all"><Edit3 size={16}/></button>
                        <button onClick={()=>handleDelete(t.id)} className="p-3 bg-white/5 text-zinc-400 hover:text-red-400 rounded-xl border border-white/10 shadow-md transition-all"><Trash2 size={16}/></button>
                     </div>
                  </div>
               </div>
             ))
           )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
           <div className="bg-[#0c0c0e] border border-white/10 w-full max-w-lg p-8 rounded-[3rem] shadow-2xl relative animate-in zoom-in duration-300 text-left">
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-all"><X size={24} /></button>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8">{editingId ? 'Editar Movimentação' : 'Novo Lançamento'}</h2>
              <div className="space-y-5">
                <div className="flex gap-2 p-1.5 bg-black rounded-2xl border border-white/10">
                  <button onClick={()=>setForm({...form, type: TransactionType.INCOME})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all italic tracking-widest ${form.type === TransactionType.INCOME ? 'bg-emerald-500 text-white shadow-lg' : 'text-zinc-500'}`}>Entrada (Receita)</button>
                  <button onClick={()=>setForm({...form, type: TransactionType.EXPENSE})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all italic tracking-widest ${form.type === TransactionType.EXPENSE ? 'bg-[#FF2D55] text-white shadow-lg' : 'text-zinc-500'}`}>Saída (Despesa)</button>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase mb-1.5 block italic tracking-widest">Descrição</label>
                  <input type="text" value={form.description} onChange={(e)=>setForm({...form, description: e.target.value.toUpperCase()})} placeholder="Ex: Compra de Óleo 5W30, Aluguel, etc" className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-[#FF2D55]"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase mb-1.5 block italic tracking-widest">Valor (R$)</label>
                    <input type="number" value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})} placeholder="0,00" className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white font-black text-base outline-none focus:border-[#FF2D55]"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase mb-1.5 block italic tracking-widest">Data</label>
                    <input type="date" value={form.date} onChange={(e)=>setForm({...form, date: e.target.value})} className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-[#FF2D55]"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase mb-1.5 block italic tracking-widest">Categoria</label>
                    <select value={form.category} onChange={(e)=>setForm({...form, category: e.target.value})} className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-[#FF2D55]">
                       {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase mb-1.5 block italic tracking-widest">Método</label>
                    <select value={form.method} onChange={(e)=>setForm({...form, method: e.target.value as PaymentMethod})} className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-[#FF2D55]">
                       {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleSave} className="w-full bg-[#FF2D55] hover:bg-[#FF2D55]/90 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-2 active:scale-95 transition-all text-white italic">
                  Salvar Lançamento
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Financial;

