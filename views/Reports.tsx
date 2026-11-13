import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Calendar, Users, Car, 
  ArrowDownRight, ArrowUpRight, Award, Wrench, Download, Printer, Filter
} from 'lucide-react';
import { ServiceOrder, UserSession, FinancialTransaction } from '../types';

interface ReportsProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

export const Reports: React.FC<ReportsProps> = ({ session }) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [period, setPeriod] = useState<'TODAY' | 'MONTH' | 'YEAR'>('MONTH');

  const tenant = session?.username || 'rafael';

  useEffect(() => {
    const loadData = () => {
      const savedOrders = localStorage.getItem(`kaenpro_${tenant}_orders`) || localStorage.getItem('kaenpro_rafael_orders');
      if (savedOrders) {
        try { setOrders(JSON.parse(savedOrders)); } catch (e) {}
      }

      const savedTrans = localStorage.getItem(`kaenpro_${tenant}_transactions`) || localStorage.getItem('kaenpro_rafael_transactions');
      if (savedTrans) {
        try { setTransactions(JSON.parse(savedTrans)); } catch (e) {}
      }
    };

    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [tenant]);

  // Calculations based on period
  const now = new Date();
  const filteredOrders = orders.filter(os => {
    const date = new Date(os.createdAt);
    if (period === 'TODAY') {
      return date.toDateString() === now.toDateString();
    }
    if (period === 'MONTH') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    return date.getFullYear() === now.getFullYear();
  });

  const totalRevenue = filteredOrders.reduce((sum, os) => sum + (os.totalValue || 0), 0);
  const totalLabor = filteredOrders.reduce((sum, os) => sum + (os.laborValue || 0), 0);
  const partsTotal = totalRevenue - totalLabor;
  const estimatedPartsCost = partsTotal * 0.55; // Estimated 45% parts margin
  const generalExpenses = 2850; // Operating overhead (rent, power, tools)
  const totalCosts = estimatedPartsCost + (period === 'TODAY' ? generalExpenses / 30 : generalExpenses);
  const estimatedNetProfit = Math.max(0, totalRevenue - totalCosts);
  const marginPercentage = totalRevenue > 0 ? ((estimatedNetProfit / totalRevenue) * 100).toFixed(1) : '0';
  const ticketMedio = filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length) : 0;

  // Mechanics breakdown
  const mechanicMap: Record<string, { count: number; total: number }> = {};
  filteredOrders.forEach(os => {
    const mech = os.mechanicResponsible || 'Equipe Geral';
    if (!mechanicMap[mech]) mechanicMap[mech] = { count: 0, total: 0 };
    mechanicMap[mech].count += 1;
    mechanicMap[mech].total += os.totalValue || 0;
  });

  // Services ranking
  const serviceMap: Record<string, number> = {};
  filteredOrders.forEach(os => {
    os.items?.forEach(item => {
      serviceMap[item.description] = (serviceMap[item.description] || 0) + item.quantity;
    });
  });

  const topServices = Object.entries(serviceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="w-full max-w-[1200px] space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-zinc-950/80 border border-white/5 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-widest">
            <BarChart3 size={16} />
            <span>Inteligência de Gestão & Indicadores</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1 italic">
            Relatórios Financeiros & de Lucro
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Faturamento, custos reais de peças, margens líquidas, ticket médio e produtividade da bancada.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-white/10 rounded-2xl">
          {[
            { id: 'TODAY', label: 'Hoje' },
            { id: 'MONTH', label: 'Este Mês' },
            { id: 'YEAR', label: 'Ano Vigente' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                ${period === p.id ? 'bg-[#FF2D55] text-white shadow-md shadow-[#FF2D55]/30' : 'text-zinc-400 hover:text-white'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Financial Waterfall (Faturamento -> Custos -> Lucro) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-zinc-950/80 border border-white/5 rounded-3xl space-y-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">1. Faturamento Bruto</span>
          <span className="text-2xl font-black text-white font-mono">
            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-emerald-400 font-bold block">
            {filteredOrders.length} ordens de serviço
          </span>
        </div>

        <div className="p-5 bg-zinc-950/80 border border-white/5 rounded-3xl space-y-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block">2. Custo de Peças & Insumos</span>
          <span className="text-2xl font-black text-amber-400 font-mono">
            R$ {estimatedPartsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-zinc-500 font-bold block">
            Margem comercial de 45%
          </span>
        </div>

        <div className="p-5 bg-zinc-950/80 border border-white/5 rounded-3xl space-y-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 block">3. Ticket Médio por Veículo</span>
          <span className="text-2xl font-black text-blue-400 font-mono">
            R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-zinc-400 font-bold block">
            Média por atendimento
          </span>
        </div>

        <div className="p-5 bg-gradient-to-br from-emerald-950/40 to-zinc-950 border border-emerald-500/30 rounded-3xl space-y-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">4. Lucro Líquido Estimado</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            R$ {estimatedNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-emerald-300 font-black block">
            Margem Líquida: {marginPercentage}%
          </span>
        </div>
      </div>

      {/* Ranks: Serviços mais vendidos & Produtividade da Equipe */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Serviços */}
        <div className="p-6 bg-zinc-950/70 border border-white/5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Wrench size={16} className="text-[#FF2D55]" />
              <span>Serviços & Peças Mais Vendidos</span>
            </h3>
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Top 5</span>
          </div>

          <div className="space-y-3">
            {topServices.length === 0 ? (
              <p className="text-xs text-zinc-500">Nenhum item registrado no período.</p>
            ) : (
              topServices.map(([name, count], idx) => (
                <div key={name} className="flex items-center justify-between p-3 bg-black/50 rounded-2xl border border-white/5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-zinc-900 font-bold text-zinc-400 flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="text-white font-bold">{name}</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">{count}x saídas</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Produtividade da Equipe */}
        <div className="p-6 bg-zinc-950/70 border border-white/5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Users size={16} className="text-blue-400" />
              <span>Receita Gerada por Mecânico / Técnico</span>
            </h3>
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Performance</span>
          </div>

          <div className="space-y-3">
            {Object.keys(mechanicMap).length === 0 ? (
              <p className="text-xs text-zinc-500">Nenhum serviço registrado no período.</p>
            ) : (
              Object.entries(mechanicMap).map(([mech, data]) => (
                <div key={mech} className="flex items-center justify-between p-3 bg-black/50 rounded-2xl border border-white/5 text-xs">
                  <div>
                    <p className="text-white font-black uppercase">{mech}</p>
                    <span className="text-[10px] text-zinc-500">{data.count} veículos finalizados</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
