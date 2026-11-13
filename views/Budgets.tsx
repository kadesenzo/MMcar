import React, { useState, useEffect } from 'react';
import {
  FileText, CheckCircle2, XCircle, Clock, MessageCircle,
  Search, Eye, DollarSign, Copy, Check, Edit3, History, X, Save, Plus, Trash2
} from 'lucide-react';
import { ServiceOrder, OSStatus, UserSession, BudgetRevision, OSItem } from '../types';
import {
  readWorkshopData, writeWorkshopData, createOSTimelineEvent,
  appendAuditLog, pushSystemNotification
} from '../src/utils/workshopHelpers';

interface BudgetsProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

export const Budgets: React.FC<BudgetsProps> = ({ session, syncData }) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AGUARDANDO' | 'APROVADO' | 'RECUSADO'>('ALL');
  const [selectedBudget, setSelectedBudget] = useState<ServiceOrder | null>(null);
  const [showApprovalPortal, setShowApprovalPortal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState<ServiceOrder | null>(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [editingBudget, setEditingBudget] = useState<ServiceOrder | null>(null);
  const [editProblem, setEditProblem] = useState('');
  const [editItems, setEditItems] = useState<OSItem[]>([]);
  const [editLabor, setEditLabor] = useState('0');
  const [editDiscount, setEditDiscount] = useState('0');
  const [editSummary, setEditSummary] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const tenant = session?.username || 'rafael';
  const activeUser = session?.activeUser || session?.username || 'Atendimento';

  const loadData = () => {
    setOrders(readWorkshopData<ServiceOrder[]>(tenant, 'orders', []));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [tenant]);

  const persistOrders = async (updated: ServiceOrder[]) => {
    setOrders(updated);
    writeWorkshopData(tenant, 'orders', updated);
    if (syncData) await syncData('orders', updated);
  };

  const budgetList = orders.filter(os => {
    const matchesSearch =
      (os.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (os.vehiclePlate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (os.vehicleModel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (os.osNumber || '').includes(searchTerm);
    if (!matchesSearch) return false;

    const isApproved = Boolean(
      os.budgetApproved ||
      [OSStatus.EM_SERVICO, OSStatus.EM_ANDAMENTO, OSStatus.FINALIZACAO, OSStatus.PRONTO, OSStatus.ENTREGUE, OSStatus.FINALIZADO].includes(os.status)
    );
    const isRefused = os.budgetRejected || os.status === OSStatus.CANCELADO;

    if (statusFilter === 'AGUARDANDO') return !isApproved && !isRefused;
    if (statusFilter === 'APROVADO') return isApproved;
    if (statusFilter === 'RECUSADO') return isRefused;
    return true;
  });

  const handleApproveBudget = async (os: ServiceOrder) => {
    const version = (os.budgetRevisions?.length || 0) + 1;
    const rev: BudgetRevision = {
      id: `rev-${Date.now()}`,
      version,
      updatedBy: activeUser,
      totalValue: os.totalValue,
      discount: os.discount || 0,
      itemsCount: os.items?.length || 0,
      summary: 'Orçamento aprovado pelo cliente e liberado para execução',
      status: 'APROVADO',
      timestamp: new Date().toISOString()
    };

    const updated = orders.map(item =>
      item.id === os.id
        ? {
            ...item,
            budgetApproved: true,
            budgetRejected: false,
            approvedAt: new Date().toISOString(),
            status: OSStatus.EM_SERVICO,
            budgetRevisions: [rev, ...(item.budgetRevisions || [])],
            timeline: [
              createOSTimelineEvent(
                'ORCAMENTO_APROVADO',
                `Orçamento aprovado (R$ ${(item.totalValue || 0).toFixed(2)}) — OS liberada para oficina`,
                activeUser,
                session?.role
              ),
              ...(item.timeline || [])
            ],
            updatedAt: new Date().toISOString()
          }
        : item
    );

    await persistOrders(updated);
    appendAuditLog(tenant, activeUser, 'APROVOU_ORCAMENTO', `OS #${os.osNumber}`, `${os.vehiclePlate} • R$ ${(os.totalValue || 0).toFixed(2)}`);
    pushSystemNotification(tenant, {
      title: `Orçamento Aprovado • ${os.vehiclePlate}`,
      message: `OS #${os.osNumber} (${os.clientName}) aprovada e liberada para execução.`,
      category: 'PATIO',
      severity: 'INFO',
      relatedPath: '/patio',
      relatedId: os.id
    });
  };

  const handleConfirmRefusal = async () => {
    if (!showRefuseModal) return;
    const reason = refusalReason.trim() || 'Não informado pelo cliente';
    const os = showRefuseModal;
    const version = (os.budgetRevisions?.length || 0) + 1;
    const rev: BudgetRevision = {
      id: `rev-${Date.now()}`,
      version,
      updatedBy: activeUser,
      totalValue: os.totalValue,
      discount: os.discount || 0,
      itemsCount: os.items?.length || 0,
      summary: `Recusado: ${reason}`,
      status: 'RECUSADO',
      timestamp: new Date().toISOString()
    };

    const updated = orders.map(item =>
      item.id === os.id
        ? {
            ...item,
            budgetApproved: false,
            budgetRejected: true,
            budgetRejectionReason: reason,
            status: OSStatus.CANCELADO,
            budgetRevisions: [rev, ...(item.budgetRevisions || [])],
            timeline: [
              createOSTimelineEvent(
                'ORCAMENTO_RECUSADO',
                `Orçamento recusado. Motivo: ${reason}`,
                activeUser,
                session?.role
              ),
              ...(item.timeline || [])
            ],
            updatedAt: new Date().toISOString()
          }
        : item
    );

    await persistOrders(updated);
    appendAuditLog(tenant, activeUser, 'RECUSOU_ORCAMENTO', `OS #${os.osNumber}`, reason);
    setShowRefuseModal(null);
    setRefusalReason('');
    setShowApprovalPortal(false);
  };

  const openEditModal = (os: ServiceOrder) => {
    setEditingBudget(os);
    setEditProblem(os.problem || '');
    setEditItems([...(os.items || [])]);
    setEditLabor((os.laborValue || 0).toString());
    setEditDiscount((os.discount || 0).toString());
    setEditSummary('');
  };

  const handleSaveRevision = async () => {
    if (!editingBudget) return;
    const laborVal = parseFloat(editLabor) || 0;
    const discountVal = parseFloat(editDiscount) || 0;
    const itemsSum = editItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const nextTotal = Math.max(0, itemsSum + laborVal - discountVal);
    const version = (editingBudget.budgetRevisions?.length || 0) + 1;

    const rev: BudgetRevision = {
      id: `rev-${Date.now()}`,
      version,
      updatedBy: activeUser,
      totalValue: nextTotal,
      discount: discountVal,
      itemsCount: editItems.length,
      summary: editSummary.trim() || `Revisão #${version} de peças/serviços e valores`,
      status: 'REVISADO',
      timestamp: new Date().toISOString()
    };

    const updated = orders.map(os =>
      os.id === editingBudget.id
        ? {
            ...os,
            problem: editProblem,
            items: editItems,
            laborValue: laborVal,
            discount: discountVal,
            totalValue: nextTotal,
            budgetRevisions: [rev, ...(os.budgetRevisions || [])],
            timeline: [
              createOSTimelineEvent(
                'REVISAO_ORCAMENTO',
                `Revisão v${version} salva (${rev.summary}) — Novo total: R$ ${nextTotal.toFixed(2)}`,
                activeUser,
                session?.role
              ),
              ...(os.timeline || [])
            ],
            updatedAt: new Date().toISOString()
          }
        : os
    );

    await persistOrders(updated);
    appendAuditLog(tenant, activeUser, 'REVISOU_ORCAMENTO', `OS #${editingBudget.osNumber}`, `v${version} • R$ ${nextTotal.toFixed(2)}`);
    setEditingBudget(null);
  };

  const handleSendWhatsApp = async (os: ServiceOrder) => {
    const phone = (os.clientPhone || '').replace(/\D/g, '');
    const pecasList = (os.items || []).filter(i => i.type === 'PART');
    const servicosList = (os.items || []).filter(i => i.type === 'SERVICE');

    let text = `Olá, *${os.clientName}*!\n\n`;
    text += `A *MM Car Auto Center* concluiu a avaliação técnica do seu *${os.vehicleModel}* (Placa: *${os.vehiclePlate}* — OS #${os.osNumber}).\n\n`;
    text += `*Diagnóstico Técnico:*\n${os.problem || 'Revisão preventiva e diagnóstico geral'}\n\n`;

    if (pecasList.length > 0) {
      text += `*Peças Necessárias:*\n`;
      pecasList.forEach(p => {
        text += `• ${p.description} (${p.quantity}x) — R$ ${(p.quantity * p.unitPrice).toFixed(2)}\n`;
      });
      text += `\n`;
    }

    if (servicosList.length > 0 || (os.laborValue || 0) > 0) {
      text += `*Serviços & Mão de Obra:*\n`;
      servicosList.forEach(s => {
        text += `• ${s.description} — R$ ${(s.quantity * s.unitPrice).toFixed(2)}\n`;
      });
      if ((os.laborValue || 0) > 0) {
        text += `• Mão de Obra Especializada — R$ ${(os.laborValue || 0).toFixed(2)}\n`;
      }
      text += `\n`;
    }

    if ((os.discount || 0) > 0) {
      text += `*Desconto Especial:* -R$ ${(os.discount || 0).toFixed(2)}\n`;
    }

    text += `*VALOR TOTAL DO ORÇAMENTO: R$ ${(os.totalValue || 0).toFixed(2)}*\n`;
    text += `*Garantia:* 90 dias em peças e mão de obra.\n\n`;
    text += `Para autorizar a execução, responda esta mensagem com *AUTORIZADO*.\n\n`;
    text += `_MM Car Auto Center • Gestão Automotiva de Alto Padrão_`;

    const cleanPhone = phone.length >= 10 ? (phone.startsWith('55') ? phone : `55${phone}`) : '';
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    if (!os.budgetApproved && os.status !== OSStatus.EM_SERVICO) {
      const updated = orders.map(item =>
        item.id === os.id
          ? {
              ...item,
              status: OSStatus.ORCAMENTO_ENVIADO,
              timeline: [
                createOSTimelineEvent('ORCAMENTO_ENVIADO', 'Proposta enviada ao cliente via WhatsApp', activeUser, session?.role),
                ...(item.timeline || [])
              ],
              updatedAt: new Date().toISOString()
            }
          : item
      );
      await persistOrders(updated);
    }
  };

  const copyApprovalText = (os: ServiceOrder) => {
    const text = `Orçamento MM Car Auto Center — ${os.vehicleModel} (${os.vehiclePlate}) | OS #${os.osNumber} | Total: R$ ${(os.totalValue || 0).toFixed(2)}.`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const approvedCount = orders.filter(
    o => o.budgetApproved || [OSStatus.EM_SERVICO, OSStatus.EM_ANDAMENTO, OSStatus.FINALIZACAO, OSStatus.PRONTO, OSStatus.ENTREGUE, OSStatus.FINALIZADO].includes(o.status)
  ).length;
  const refusedCount = orders.filter(o => o.budgetRejected || o.status === OSStatus.CANCELADO).length;
  const waitingCount = Math.max(0, orders.length - approvedCount - refusedCount);

  return (
    <div className="w-full max-w-[1300px] mx-auto space-y-6 p-4 md:p-8 pb-28 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-zinc-950/90 border border-white/10 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 text-[#FF2D55] text-[10px] font-black uppercase tracking-[0.25em]">
            <DollarSign size={14} />
            <span>Módulo 06 • Orçamentos & Aprovação</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
            Orçamentos, Revisões & Aprovação
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Orçamento não é Nota Fiscal nem OS executada: controle revisões com histórico, envio em 1 clique e aprovação ou recusa motivada.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Aguardando</span>
            <span className="text-lg font-black text-amber-400 font-mono tabular-nums">{waitingCount}</span>
          </div>
          <div className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">Aprovados</span>
            <span className="text-lg font-black text-emerald-400 font-mono tabular-nums">{approvedCount}</span>
          </div>
          <div className="px-4 py-2.5 bg-red-500/10 border border-red-500/25 rounded-2xl text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-red-400 block">Recusados</span>
            <span className="text-lg font-black text-red-400 font-mono tabular-nums">{refusedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por cliente, placa, modelo ou número da OS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-white/10 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF2D55]"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-white/10 rounded-2xl w-full md:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'AGUARDANDO', label: 'Aguardando Aprovação' },
            { id: 'APROVADO', label: 'Aprovados' },
            { id: 'RECUSADO', label: 'Recusados' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab.id ? 'bg-[#FF2D55] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget List */}
      <div className="space-y-3">
        {budgetList.length === 0 ? (
          <div className="p-12 text-center bg-zinc-950/60 border border-dashed border-white/10 rounded-3xl space-y-3">
            <FileText size={32} className="mx-auto text-zinc-600" />
            <p className="text-sm font-bold text-zinc-400">Nenhum orçamento encontrado com esses filtros.</p>
          </div>
        ) : (
          budgetList.map(os => {
            const isApproved = Boolean(
              os.budgetApproved ||
              [OSStatus.EM_SERVICO, OSStatus.EM_ANDAMENTO, OSStatus.FINALIZACAO, OSStatus.PRONTO, OSStatus.ENTREGUE, OSStatus.FINALIZADO].includes(os.status)
            );
            const isRefused = Boolean(os.budgetRejected || os.status === OSStatus.CANCELADO);
            const isPending = !isApproved && !isRefused;
            const revisionsCount = os.budgetRevisions?.length || 0;

            return (
              <div
                key={os.id}
                className="p-5 bg-zinc-950/90 hover:bg-zinc-900/80 border border-white/10 rounded-3xl transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isApproved
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isRefused
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    {isApproved ? <CheckCircle2 size={22} /> : isRefused ? <XCircle size={22} /> : <Clock size={22} />}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-zinc-400">OS #{os.osNumber}</span>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">{os.clientName}</h3>
                      <span className="text-xs font-mono font-bold text-[#FF2D55] bg-[#FF2D55]/10 px-2 py-0.5 rounded-lg">
                        {os.vehiclePlate}
                      </span>
                      <span className="text-xs text-zinc-400">{os.vehicleModel}</span>
                      {revisionsCount > 0 && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {revisionsCount} revisão(ões)
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-1">
                      {os.problem || 'Diagnóstico padrão e manutenção preventiva.'}
                    </p>

                    {isRefused && os.budgetRejectionReason && (
                      <p className="text-[11px] text-red-400 font-semibold">
                        Motivo da recusa: {os.budgetRejectionReason}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium flex-wrap">
                      <span>{os.items?.length || 0} itens</span>
                      <span>•</span>
                      <span>Mão de obra: R$ {(os.laborValue || 0).toFixed(2)}</span>
                      {(os.discount || 0) > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">Desconto: -R$ {(os.discount || 0).toFixed(2)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Atualizado: {new Date(os.updatedAt || os.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
                  <div className="text-left lg:text-right">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Total Orçamento</span>
                    <span className="text-lg font-black text-white font-mono tabular-nums">
                      R$ {(os.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <div className="mt-0.5">
                      {isApproved && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Aprovado
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          Aguardando Aprovação
                        </span>
                      )}
                      {isRefused && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          Recusado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(os)}
                      title="Editar / Criar Revisão de Orçamento"
                      className="p-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 size={15} className="text-sky-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Revisar</span>
                    </button>

                    <button
                      onClick={() => handleSendWhatsApp(os)}
                      title="Enviar Orçamento via WhatsApp"
                      className="p-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30 rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle size={15} />
                      <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">WhatsApp</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedBudget(os);
                        setShowApprovalPortal(true);
                      }}
                      title="Abrir Portal de Aprovação Digital"
                      className="p-3 bg-[#FF2D55] hover:bg-[#e02448] text-white rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={15} />
                      <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Aprovação</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Portal de Aprovação Digital */}
      {showApprovalPortal && selectedBudget && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowApprovalPortal(false)}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-900 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF2D55] bg-[#FF2D55]/10 px-3 py-1 rounded-full">
                Portal de Aprovação Digital
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">MM Car Auto Center</h2>
              <p className="text-xs text-zinc-400">
                Orçamento técnico preparado para <strong className="text-white">{selectedBudget.clientName}</strong>
              </p>
            </div>

            <div className="p-4 bg-zinc-900/70 border border-white/10 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Veículo Avaliado</span>
                <p className="text-sm font-black text-white uppercase">{selectedBudget.vehicleModel}</p>
                <p className="text-xs font-mono text-[#FF2D55] font-bold">{selectedBudget.vehiclePlate}</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">OS Referência</span>
                <p className="text-sm font-mono font-bold text-zinc-300">#{selectedBudget.osNumber}</p>
                <p className="text-[10px] text-zinc-500">{new Date(selectedBudget.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Diagnóstico Técnico</span>
              <div className="p-3.5 bg-black border border-white/10 rounded-xl text-xs text-zinc-300">
                {selectedBudget.problem || 'Revisão técnica preventiva.'}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Peças & Serviços Orçados</span>
              <div className="space-y-1.5">
                {(selectedBudget.items || []).map((item, index) => (
                  <div key={index} className="p-3 bg-zinc-900/60 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${item.type === 'PART' ? 'bg-amber-500/15 text-amber-400' : 'bg-sky-500/15 text-sky-400'}`}>
                        {item.type === 'PART' ? 'PEÇA' : 'SERVIÇO'}
                      </span>
                      <span className="text-zinc-200 font-bold">{item.description}</span>
                      <span className="text-zinc-500 text-[10px]">({item.quantity}x)</span>
                    </div>
                    <span className="font-mono font-bold text-white">
                      R$ {(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                ))}
                {(selectedBudget.laborValue || 0) > 0 && (
                  <div className="p-3 bg-zinc-900/60 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-zinc-200 font-bold">Mão de Obra Especializada</span>
                    <span className="font-mono font-bold text-white">R$ {(selectedBudget.laborValue || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {(selectedBudget.budgetRevisions || []).length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <History size={12} /> Histórico de Revisões
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {(selectedBudget.budgetRevisions || []).map(rev => (
                    <div key={rev.id} className="p-2.5 bg-black/50 border border-white/5 rounded-xl flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-zinc-200">v{rev.version} • {rev.status}</span>
                        <span className="text-zinc-400 ml-2">{rev.summary}</span>
                      </div>
                      <span className="font-mono font-bold text-zinc-300">R$ {rev.totalValue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-5 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Total do Orçamento</span>
                <p className="text-xs text-zinc-500">Garantia técnica de 90 dias em peças e mão de obra</p>
              </div>
              <span className="text-2xl font-black text-white font-mono tabular-nums">
                R$ {(selectedBudget.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={async () => {
                  await handleApproveBudget(selectedBudget);
                  setShowApprovalPortal(false);
                }}
                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={18} /> Aprovar Orçamento
              </button>

              <button
                onClick={() => {
                  setShowRefuseModal(selectedBudget);
                  setRefusalReason('');
                }}
                className="py-4 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 rounded-2xl font-black uppercase text-xs tracking-widest transition-all cursor-pointer"
              >
                Recusar
              </button>

              <button
                onClick={() => copyApprovalText(selectedBudget)}
                className="py-4 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Recusar com Motivo */}
      {showRefuseModal && (
        <div className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-red-500/30 rounded-3xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase text-red-400">Registrar Recusa de Orçamento</h3>
              <button onClick={() => setShowRefuseModal(null)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <p className="text-xs text-zinc-400">
              OS #{showRefuseModal.osNumber} ({showRefuseModal.vehiclePlate}). Informe o motivo da recusa para histórico comercial:
            </p>
            <textarea
              rows={3}
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
              placeholder="Ex: Cliente achou valor elevado, vai aguardar próximo mês, fechou parcial..."
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRefuseModal(null)} className="px-4 py-2.5 bg-zinc-900 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleConfirmRefusal} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase cursor-pointer">
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar / Revisar Orçamento */}
      {editingBudget && (
        <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-white/10 rounded-[2rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">Revisão de Proposta Comercial</span>
                <h3 className="text-lg font-black text-white uppercase">
                  OS #{editingBudget.osNumber} • {editingBudget.vehiclePlate} ({editingBudget.clientName})
                </h3>
              </div>
              <button onClick={() => setEditingBudget(null)} className="p-2 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase">Diagnóstico / Escopo</label>
              <textarea
                rows={2}
                value={editProblem}
                onChange={(e) => setEditProblem(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#FF2D55]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-zinc-400 uppercase">Peças & Serviços do Orçamento</label>
                <button
                  onClick={() => setEditItems([...editItems, { id: `it-${Date.now()}`, description: '', quantity: 1, unitPrice: 0, type: 'SERVICE' }])}
                  className="px-3 py-1.5 bg-[#FF2D55] text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Adicionar Item
                </button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {editItems.map(item => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-black/60 p-2.5 rounded-xl border border-white/10">
                    <select
                      value={item.type}
                      onChange={(e) => setEditItems(editItems.map(i => i.id === item.id ? { ...i, type: e.target.value as 'PART' | 'SERVICE' } : i))}
                      className="col-span-3 sm:col-span-2 bg-zinc-900 border border-white/10 rounded-lg px-2 py-2 text-[11px] text-white font-bold"
                    >
                      <option value="PART">Peça</option>
                      <option value="SERVICE">Serviço</option>
                    </select>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => setEditItems(editItems.map(i => i.id === item.id ? { ...i, description: e.target.value.toUpperCase() } : i))}
                      placeholder="Descrição..."
                      className="col-span-9 sm:col-span-5 bg-transparent text-xs font-bold text-white outline-none"
                    />
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) => setEditItems(editItems.map(i => i.id === item.id ? { ...i, quantity: parseFloat(e.target.value) || 0 } : i))}
                      className="col-span-4 sm:col-span-2 bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs font-mono text-white text-center"
                    />
                    <input
                      type="number"
                      value={item.unitPrice || ''}
                      onChange={(e) => setEditItems(editItems.map(i => i.id === item.id ? { ...i, unitPrice: parseFloat(e.target.value) || 0 } : i))}
                      className="col-span-6 sm:col-span-2 bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs font-mono text-white"
                    />
                    <button
                      onClick={() => setEditItems(editItems.filter(i => i.id !== item.id))}
                      className="col-span-2 sm:col-span-1 text-zinc-500 hover:text-red-400 flex justify-center cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase">Mão de Obra (R$)</label>
                <input
                  type="number"
                  value={editLabor}
                  onChange={(e) => setEditLabor(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase">Desconto (R$)</label>
                <input
                  type="number"
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold text-emerald-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase">Motivo da Revisão</label>
                <input
                  type="text"
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Ex: Ajuste de desconto / troca de marca"
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-500 block">Novo Total Revisado</span>
                <span className="text-2xl font-black text-[#FF2D55] font-mono tabular-nums">
                  R$ {Math.max(0, editItems.reduce((a, i) => a + i.quantity * i.unitPrice, 0) + (parseFloat(editLabor) || 0) - (parseFloat(editDiscount) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={handleSaveRevision}
                className="px-6 py-3.5 bg-[#FF2D55] hover:bg-[#e02448] text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
              >
                <Save size={16} /> Salvar Revisão no Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
