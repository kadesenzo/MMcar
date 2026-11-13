import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle, Calendar, TrendingUp, Activity, AlertTriangle, CheckCircle2,
  DollarSign, Wrench, Package, ArrowRight, Smartphone, Clock, Car,
  ShieldCheck, ChevronRight, Kanban, Receipt, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ServiceOrder, OSStatus, UserSession, Appointment, Part,
  FinancialTransaction, TransactionType, Employee
} from '../types';
import {
  readWorkshopData, calculateOSPartsCost, isOrderStalled,
  getVehicleStalledHours, isActiveWorkshopStatus
} from '../src/utils/workshopHelpers';

const Dashboard: React.FC<{ session?: UserSession }> = ({ session }) => {
  const navigate = useNavigate();
  const tenant = session?.username || 'rafael';
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [revenuePeriod, setRevenuePeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');

  useEffect(() => {
    const load = () => {
      setOrders(readWorkshopData<ServiceOrder[]>(tenant, 'orders', []));
      setAppointments(readWorkshopData<Appointment[]>(tenant, 'appointments', []));
      setParts(readWorkshopData<Part[]>(tenant, 'parts', []));
      setTransactions(readWorkshopData<FinancialTransaction[]>(tenant, 'transactions', []));
      setEmployees(readWorkshopData<Employee[]>(tenant, 'employees', []));
    };

    load();
    window.addEventListener('kaen_storage_updated', load);
    return () => window.removeEventListener('kaen_storage_updated', load);
  }, [tenant]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeOrders = orders.filter((o) => isActiveWorkshopStatus(o.status));
    const receivedToday = orders.filter((o) => o.createdAt && o.createdAt.startsWith(todayStr)).length;
    const inMaintenance = orders.filter((o) =>
      [OSStatus.EM_DIAGNOSTICO, OSStatus.EM_SERVICO, OSStatus.EM_ANDAMENTO].includes(o.status)
    ).length;
    const awaitingApproval = orders.filter((o) =>
      [OSStatus.AGUARDANDO_APROVACAO, OSStatus.ORCAMENTO_ENVIADO, OSStatus.ORCAMENTO].includes(o.status)
    ).length;
    const readyCars = orders.filter((o) =>
      [OSStatus.PRONTO, OSStatus.FINALIZACAO].includes(o.status)
    ).length;
    const completedOrders = orders.filter((o) =>
      [OSStatus.ENTREGUE, OSStatus.FINALIZADO, OSStatus.PRONTO].includes(o.status)
    );
    const overdueOrders = orders.filter((o) => {
      if (!isActiveWorkshopStatus(o.status) || !o.dueDate) return false;
      return new Date(o.dueDate) < now;
    });
    const stalledList = orders
      .filter((o) => isOrderStalled(o, 48))
      .sort((a, b) => getVehicleStalledHours(b) - getVehicleStalledHours(a));

    // Revenue by Day / Week / Month
    const filterByPeriod = (dateStr?: string) => {
      if (!dateStr) return false;
      if (revenuePeriod === 'DAY') return dateStr.startsWith(todayStr);
      const d = new Date(dateStr);
      if (revenuePeriod === 'WEEK') return d >= weekAgo;
      return d >= monthStart;
    };

    const periodOrders = orders.filter((o) => filterByPeriod(o.createdAt) && o.status !== OSStatus.CANCELADO);
    const periodRevenue = periodOrders.reduce((acc, o) => acc + (o.totalValue || 0), 0);
    const periodLabor = periodOrders.reduce((acc, o) => acc + (o.laborValue || 0), 0);
    const periodPartsSale = Math.max(0, periodRevenue - periodLabor);

    const totalRevenue = orders
      .filter((o) => o.status !== OSStatus.CANCELADO)
      .reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
    const totalPartsCost = orders
      .filter((o) => o.status !== OSStatus.CANCELADO)
      .reduce((acc, curr) => acc + calculateOSPartsCost(curr, parts), 0);
    const totalExpenses = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const estimatedRealProfit = totalRevenue - totalPartsCost - totalExpenses;
    const profitMarginPct = totalRevenue > 0 ? (estimatedRealProfit / totalRevenue) * 100 : 0;

    // Productivity by mechanic
    const mechanicMap: Record<string, { name: string; active: number; done: number; rework: number; revenue: number }> = {};
    for (const emp of employees.filter((e) => e.status === 'Ativo')) {
      mechanicMap[emp.name] = { name: emp.name, active: 0, done: 0, rework: 0, revenue: 0 };
    }
    for (const o of orders) {
      const mechs = o.assignedMechanics?.length
        ? o.assignedMechanics
        : o.mechanicResponsible
        ? [o.mechanicResponsible]
        : [];
      for (const m of mechs) {
        if (!mechanicMap[m]) mechanicMap[m] = { name: m, active: 0, done: 0, rework: 0, revenue: 0 };
        if (isActiveWorkshopStatus(o.status)) mechanicMap[m].active += 1;
        else if (o.status !== OSStatus.CANCELADO) mechanicMap[m].done += 1;
        if (o.isRework) mechanicMap[m].rework += 1;
        mechanicMap[m].revenue += (o.totalValue || 0) / mechs.length;
      }
    }

    const estimatedPipelineGain =
      appointments.filter((a) => a.status === 'Agendado' || a.status === 'Pendente').length * 650;

    return {
      activeCount: activeOrders.length,
      receivedToday,
      inMaintenance,
      awaitingApproval,
      readyCars,
      completedCount: completedOrders.length,
      overdueCount: overdueOrders.length,
      stalledList,
      periodRevenue,
      periodLabor,
      periodPartsSale,
      totalRevenue,
      estimatedRealProfit,
      profitMarginPct,
      estimatedPipelineGain,
      productivity: Object.values(mechanicMap).sort((a, b) => b.done + b.active - (a.done + a.active)).slice(0, 5)
    };
  }, [orders, appointments, parts, transactions, employees, revenuePeriod]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return orders.slice(0, 8);
    return orders.filter((o) => o.status === statusFilter).slice(0, 8);
  }, [orders, statusFilter]);

  const statusConfigs = [
    { label: 'Aguardando diagnóstico', key: OSStatus.AGUARDANDO_DIAGNOSTICO, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    { label: 'Em diagnóstico', key: OSStatus.EM_DIAGNOSTICO, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    { label: 'Orçamento enviado', key: OSStatus.ORCAMENTO_ENVIADO, color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    { label: 'Aguardando aprovação', key: OSStatus.AGUARDANDO_APROVACAO, color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    { label: 'Em serviço', key: OSStatus.EM_SERVICO, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    { label: 'Finalização', key: OSStatus.FINALIZACAO, color: 'bg-teal-500/10 text-teal-400 border-teal-500/30' },
    { label: 'Pronto', key: OSStatus.PRONTO, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    { label: 'Entregue', key: OSStatus.ENTREGUE, color: 'bg-zinc-800 text-zinc-400 border-zinc-700' }
  ];

  const periodLabel = revenuePeriod === 'DAY' ? 'Hoje' : revenuePeriod === 'WEEK' ? 'Últimos 7 dias' : 'Mês Atual';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-3 md:p-8 pb-32 w-full max-w-[1400px] mx-auto">
      {/* HEADER DIRETORIA */}
      <div className="w-full glass-card p-6 md:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#FF2D55] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#FF2D55]/30 shrink-0">
              <Activity size={28} />
            </div>
            <div className="text-left">
              <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
                PAINEL DIRETORIA <span className="text-[#FF2D55]">MM CAR</span>
              </h2>
              <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1.5">
                Visão Executiva • Faturamento, Pátio, Produtividade e Lucratividade
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate('/orders/new')}
              className="bg-[#FF2D55] hover:bg-[#ff1744] text-white px-5 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 italic cursor-pointer whitespace-nowrap"
            >
              <PlusCircle size={16} /> Nova Entrada / OS
            </button>
            <button
              onClick={() => navigate('/patio')}
              className="bg-white/10 hover:bg-white/15 text-white px-5 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 border border-white/10 italic cursor-pointer whitespace-nowrap"
            >
              <Kanban size={16} /> Quadro de Pátio
            </button>
            <button
              onClick={() => navigate('/fiscal')}
              className="bg-white text-black hover:bg-zinc-200 px-5 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 italic cursor-pointer whitespace-nowrap"
            >
              <Receipt size={16} className="text-[#FF2D55]" /> Fiscal NF-e
            </button>
          </div>
        </div>

        {/* Period Switcher + 7 Executive KPIs */}
        <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Indicadores Operacionais & Financeiros ({periodLabel})
            </span>
            <div className="flex items-center gap-1 bg-black/70 p-1 rounded-xl border border-white/10">
              {([
                { id: 'DAY', label: 'Dia' },
                { id: 'WEEK', label: 'Semana' },
                { id: 'MONTH', label: 'Mês' }
              ] as const).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setRevenuePeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    revenuePeriod === p.id ? 'bg-[#FF2D55] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="bg-black/60 p-4 rounded-2xl border border-white/5 text-left">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-[9px] font-black uppercase tracking-wider">No Pátio</span>
                <Car size={14} className="text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white tabular-nums">{stats.activeCount}</p>
              <span className="text-[8px] font-bold text-zinc-500 uppercase">+{stats.receivedToday} entradas hoje</span>
            </div>

            <div className="bg-black/60 p-4 rounded-2xl border border-white/5 text-left">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-[9px] font-black uppercase tracking-wider">Em Serviço</span>
                <Wrench size={14} className="text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400 tabular-nums">{stats.inMaintenance}</p>
              <span className="text-[8px] font-bold text-zinc-500 uppercase">Nos boxes</span>
            </div>

            <div className="bg-black/60 p-4 rounded-2xl border border-white/5 text-left">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-[9px] font-black uppercase tracking-wider">Aguard. Aprovação</span>
                <Clock size={14} className="text-purple-400" />
              </div>
              <p className="text-2xl font-black text-purple-400 tabular-nums">{stats.awaitingApproval}</p>
              <span className="text-[8px] font-bold text-zinc-500 uppercase">Orçamentos</span>
            </div>

            <div className="bg-black/60 p-4 rounded-2xl border border-white/5 text-left">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-[9px] font-black uppercase tracking-wider">Concluídos</span>
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400 tabular-nums">{stats.completedCount}</p>
              <span className="text-[8px] font-bold text-zinc-500 uppercase">{stats.readyCars} prontos</span>
            </div>

            <div className="bg-black/60 p-4 rounded-2xl border border-amber-500/20 text-left">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Parados / Atraso</span>
                <AlertTriangle size={14} className="text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400 tabular-nums">
                {stats.stalledList.length + stats.overdueCount}
              </p>
              <span className="text-[8px] font-bold text-zinc-500 uppercase">+48h / vencidas</span>
            </div>

            <div className="bg-black/60 p-4 rounded-2xl border border-[#FF2D55]/30 text-left">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#FF2D55]">Faturamento ({periodLabel})</span>
                <DollarSign size={14} className="text-[#FF2D55]" />
              </div>
              <p className="text-lg font-black text-[#FF2D55] tabular-nums truncate">
                R$ {stats.periodRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
              <span className="text-[8px] font-bold text-zinc-500 uppercase">M.O + Peças</span>
            </div>

            <div className="bg-black/60 p-4 rounded-2xl border border-emerald-500/25 text-left">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Lucro Real Est.</span>
                <TrendingUp size={14} className="text-emerald-400" />
              </div>
              <p className="text-lg font-black text-emerald-400 tabular-nums truncate">
                R$ {stats.estimatedRealProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
              <span className="text-[8px] font-bold text-zinc-400 uppercase tabular-nums">
                Margem {stats.profitMarginPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PRODUTIVIDADE & GARGALOS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Produtividade por Mecânico */}
        <div className="lg:col-span-7 glass-card p-6 sm:p-8 rounded-[2.5rem] border border-white/10 text-left space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-[#FF2D55] uppercase tracking-widest">DESEMPENHO INDIVIDUAL</p>
              <h3 className="text-lg font-black uppercase italic text-white">Produtividade da Equipe Técnica</h3>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="text-[10px] font-black uppercase text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              Comissões <ChevronRight size={14} />
            </button>
          </div>

          {stats.productivity.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-xs">
              Nenhuma OS atribuída a mecânicos ainda. Atribua mecânicos no Quadro de Pátio ou nas OS.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.productivity.map((m) => (
                <div key={m.name} className="p-4 rounded-2xl bg-black/60 border border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase">{m.name}</p>
                      <p className="text-[10px] text-zinc-400 tabular-nums">
                        {m.active} ativas • {m.done} concluídas {m.rework > 0 ? `• ${m.rework} retrabalho(s)` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-400 tabular-nums">
                      R$ {m.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[9px] text-zinc-500 uppercase">Produção vinculada</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gargalos / Veículos Parados */}
        <div className="lg:col-span-5 glass-card p-6 sm:p-8 rounded-[2.5rem] border border-amber-500/20 text-left space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">ALERTA DE GARGALOS</p>
              <h3 className="text-lg font-black uppercase italic text-white">Veículos Parados (+48h)</h3>
            </div>
            <button
              onClick={() => navigate('/patio')}
              className="text-[10px] font-black uppercase text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver Pátio <ChevronRight size={14} />
            </button>
          </div>

          {stats.stalledList.length === 0 ? (
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-2">
              <ShieldCheck size={28} className="mx-auto text-emerald-400" />
              <p className="text-xs font-black uppercase text-emerald-400">Fluxo de Pátio Saudável</p>
              <p className="text-[11px] text-zinc-400">Nenhum veículo parado há mais de 48 horas sem movimentação.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {stats.stalledList.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => navigate('/patio')}
                  className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 hover:border-amber-400/60 cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white uppercase truncate">
                      {ord.vehiclePlate} • {ord.vehicleModel}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {ord.status} • {ord.boxNumber || 'Sem box'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black tabular-nums shrink-0">
                    {getVehicleStalledHours(ord)}h
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4 ATALHOS SETORIAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/patio')}
          className="glass-card p-6 rounded-3xl border border-white/10 hover:border-[#FF2D55]/40 transition-all cursor-pointer group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 border border-blue-500/20">
            <Kanban size={20} />
          </div>
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">PÁTIO & BOXES</p>
          <h3 className="text-base font-black text-white uppercase italic mt-1">Kanban & Elevadores</h3>
          <p className="text-[11px] text-zinc-400 mt-1.5">Controle de Box 01 a 08, distribuição de mecânicos e etapas.</p>
        </div>

        <div
          onClick={() => navigate('/quality')}
          className="glass-card p-6 rounded-3xl border border-white/10 hover:border-[#FF2D55]/40 transition-all cursor-pointer group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
            <ShieldCheck size={20} />
          </div>
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">QUALIDADE</p>
          <h3 className="text-base font-black text-white uppercase italic mt-1">Inspeção & Garantias</h3>
          <p className="text-[11px] text-zinc-400 mt-1.5">Validação final antes da entrega, retrabalho e garantia de 90 dias.</p>
        </div>

        <div
          onClick={() => navigate('/inventory')}
          className="glass-card p-6 rounded-3xl border border-white/10 hover:border-[#FF2D55]/40 transition-all cursor-pointer group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
            <Package size={20} />
          </div>
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">ALMOXARIFADO</p>
          <h3 className="text-base font-black text-white uppercase italic mt-1">Estoque & Pedidos OS</h3>
          <p className="text-[11px] text-zinc-400 mt-1.5">Solicitações dos mecânicos vinculadas à OS e alerta de mínimo.</p>
        </div>

        <div
          onClick={() => navigate('/financial')}
          className="glass-card p-6 rounded-3xl border border-white/10 hover:border-[#FF2D55]/40 transition-all cursor-pointer group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FF2D55]/10 text-[#FF2D55] flex items-center justify-center mb-3 border border-[#FF2D55]/20">
            <DollarSign size={20} />
          </div>
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">FINANCEIRO & DRE</p>
          <h3 className="text-base font-black text-white uppercase italic mt-1">Caixa, Contas & Lucro</h3>
          <p className="text-[11px] text-zinc-400 mt-1.5">Contas a pagar/receber, fechamento de caixa diário e DRE real.</p>
        </div>
      </div>

      {/* ESTEIRA DE SERVIÇOS POR STATUS */}
      <div className="glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/10 space-y-5 text-left">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tight text-white">
              Esteira de Serviços em Tempo Real
            </h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
              Filtre por fase da Ordem de Serviço
            </p>
          </div>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-white text-black border-white' : 'bg-black text-zinc-500 border-white/10'
            }`}
          >
            Ver Todos ({orders.length})
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusConfigs.map((s) => {
            const count = orders.filter((o) => o.status === s.key).length;
            const isSelected = statusFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(isSelected ? 'ALL' : s.key)}
                className={`px-3.5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-2 cursor-pointer ${
                  s.color
                } ${isSelected ? 'ring-2 ring-white' : 'opacity-85 hover:opacity-100'}`}
              >
                <span>{s.label}</span>
                <span className="bg-black/50 px-2 py-0.5 rounded-full text-[9px] font-mono tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full py-10 text-center text-zinc-600">
              <Car size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhum veículo nesta fase.</p>
            </div>
          ) : (
            filteredOrders.map((o) => (
              <div
                key={o.id}
                onClick={() => navigate('/orders')}
                className="bg-black/60 p-5 rounded-3xl border border-white/5 hover:border-[#FF2D55]/40 transition-all flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black text-zinc-400 font-mono">OS #{o.osNumber}</span>
                    <span className="text-[9px] font-bold text-[#FF2D55] uppercase">{o.boxNumber || 'Pátio'}</span>
                  </div>
                  <p className="text-lg font-black text-white italic tracking-tight">{o.vehiclePlate}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{o.vehicleModel}</p>
                  <p className="text-[10px] text-zinc-500 mt-2 truncate">
                    <strong className="text-zinc-300">Cliente:</strong> {o.clientName}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs font-black text-[#FF2D55] tabular-nums">
                    R$ {(o.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-1">
                    Abrir <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RESUMO FINANCEIRO & AGENDA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-7 rounded-[2.5rem] border border-white/10 text-left space-y-4">
          <p className="text-zinc-500 font-black uppercase tracking-[0.25em] text-[10px] italic">
            COMPOSIÇÃO ({periodLabel})
          </p>
          <div className="flex justify-between items-center p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl">
            <div>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">MÃO DE OBRA</p>
              <p className="text-xl font-black text-white tabular-nums">
                R$ {stats.periodLabor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Wrench className="text-blue-500/40" size={28} />
          </div>
          <div className="flex justify-between items-center p-4 bg-[#FF2D55]/5 border border-[#FF2D55]/15 rounded-2xl">
            <div>
              <p className="text-[9px] font-black text-[#FF2D55] uppercase tracking-widest mb-1">PEÇAS & INSUMOS</p>
              <p className="text-xl font-black text-white tabular-nums">
                R$ {stats.periodPartsSale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Package className="text-[#FF2D55]/40" size={28} />
          </div>
        </div>

        <div className="glass-card p-7 rounded-[2.5rem] border border-white/10 text-left flex flex-col justify-between">
          <div>
            <p className="text-zinc-500 font-black uppercase tracking-[0.25em] text-[10px] mb-3 italic">
              FATURAMENTO ACUMULADO
            </p>
            <p className="text-3xl md:text-4xl font-black italic text-white tabular-nums">
              R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Total OS</p>
              <p className="text-lg font-black text-white tabular-nums">{orders.length}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Ticket Médio</p>
              <p className="text-lg font-black text-white tabular-nums">
                R${' '}
                {orders.length > 0
                  ? (stats.totalRevenue / orders.length).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
                  : '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-7 rounded-[2.5rem] border border-emerald-500/20 bg-emerald-500/5 text-left flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-emerald-400 font-black uppercase tracking-[0.25em] text-[10px] italic">
                AGENDA & PREVISÃO
              </p>
              <Calendar className="text-emerald-400" size={18} />
            </div>
            <p className="text-3xl font-black italic text-white tabular-nums">
              ~R$ {stats.estimatedPipelineGain.toLocaleString('pt-BR')}
            </p>
            <p className="text-[11px] text-zinc-400 mt-2">
              Baseado em {appointments.length} agendamentos de revisão e retornos preventivos.
            </p>
          </div>
          <button
            onClick={() => navigate('/calendar')}
            className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 text-black py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            Abrir Agenda de Pátio <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
