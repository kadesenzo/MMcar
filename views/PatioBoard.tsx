import React, { useState, useEffect, useMemo } from 'react';
import {
  Kanban, Wrench, Car, Clock, AlertTriangle, CheckCircle2,
  UserPlus, ArrowRight, ArrowLeft, RefreshCw, Plus, ShieldAlert, Search
} from 'lucide-react';
import {
  ServiceOrder, OSStatus, UserSession, WorkshopBox, Employee
} from '../types';
import {
  readWorkshopData, writeWorkshopData, loadOrInitBoxes,
  createOSTimelineEvent, appendAuditLog, pushSystemNotification,
  getVehicleStalledHours, isOrderStalled, isActiveWorkshopStatus
} from '../src/utils/workshopHelpers';
import PatioCheckinModal from '../components/PatioCheckinModal';

interface PatioBoardProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const KANBAN_COLUMNS: { id: OSStatus; label: string; accent: string }[] = [
  { id: OSStatus.AGUARDANDO_DIAGNOSTICO, label: 'Entrada / Aguard. Diag.', accent: 'border-amber-500/40 text-amber-400' },
  { id: OSStatus.EM_DIAGNOSTICO, label: 'Em Diagnóstico', accent: 'border-blue-500/40 text-blue-400' },
  { id: OSStatus.AGUARDANDO_APROVACAO, label: 'Orçamento / Aprovação', accent: 'border-purple-500/40 text-purple-400' },
  { id: OSStatus.EM_SERVICO, label: 'Em Serviço (Box)', accent: 'border-[#FF2D55]/40 text-[#FF2D55]' },
  { id: OSStatus.FINALIZACAO, label: 'Inspeção Final', accent: 'border-cyan-500/40 text-cyan-400' },
  { id: OSStatus.PRONTO, label: 'Pronto p/ Entrega', accent: 'border-emerald-500/40 text-emerald-400' }
];

const PatioBoard: React.FC<PatioBoardProps> = ({ session, syncData }) => {
  const tenant = session?.username || 'rafael';
  const [activeTab, setActiveTab] = useState<'KANBAN' | 'BOXES' | 'GARGALOS'>('KANBAN');
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [boxes, setBoxes] = useState<WorkshopBox[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCheckin, setShowCheckin] = useState(false);

  // Assignment modal state
  const [assignModalOs, setAssignModalOs] = useState<ServiceOrder | null>(null);
  const [selectedBoxCode, setSelectedBoxCode] = useState('');
  const [selectedMechanics, setSelectedMechanics] = useState<string[]>([]);

  const loadAll = () => {
    const loadedOrders = readWorkshopData<ServiceOrder[]>(tenant, 'orders', []);
    const loadedEmployees = readWorkshopData<Employee[]>(tenant, 'employees', []);
    const loadedBoxes = loadOrInitBoxes(tenant, loadedOrders);
    setOrders(loadedOrders);
    setEmployees(loadedEmployees);
    setBoxes(loadedBoxes);
  };

  useEffect(() => {
    loadAll();
    window.addEventListener('kaen_storage_updated', loadAll);
    return () => window.removeEventListener('kaen_storage_updated', loadAll);
  }, [tenant]);

  const persistOrdersAndBoxes = async (updatedOrders: ServiceOrder[], updatedBoxes?: WorkshopBox[]) => {
    setOrders(updatedOrders);
    if (syncData) {
      await syncData('orders', updatedOrders);
    } else {
      writeWorkshopData(tenant, 'orders', updatedOrders);
    }
    const nextBoxes = updatedBoxes || loadOrInitBoxes(tenant, updatedOrders);
    setBoxes(nextBoxes);
    if (syncData) {
      await syncData('boxes', nextBoxes);
    } else {
      writeWorkshopData(tenant, 'boxes', nextBoxes);
    }
  };

  const handleMoveStage = async (order: ServiceOrder, nextStatus: OSStatus) => {
    const now = new Date().toISOString();
    const timelineEvent = createOSTimelineEvent(
      'MUDANÇA DE ETAPA NO PÁTIO',
      `Veículo movido para "${nextStatus}"`,
      session?.realUsername || 'Operador',
      session?.role,
      { field: 'status', previousValue: order.status, newValue: nextStatus }
    );
    const updated = orders.map((o) => {
      if (o.id !== order.id) return o;
      const nextOrder: ServiceOrder = {
        ...o,
        status: nextStatus,
        updatedAt: now,
        timeline: [timelineEvent, ...(o.timeline || [])]
      };
      if (nextStatus === OSStatus.ENTREGUE) {
        nextOrder.deliveredAt = now;
      }
      return nextOrder;
    });
    await persistOrdersAndBoxes(updated);
    appendAuditLog(tenant, session?.realUsername || 'Operador', 'MOVEU PÁTIO', `OS #${order.osNumber}`, `${order.status} -> ${nextStatus}`);

    if (nextStatus === OSStatus.FINALIZACAO) {
      pushSystemNotification(tenant, {
        title: `OS #${order.osNumber} aguardando Inspeção Final`,
        message: `${order.vehicleModel} (${order.vehiclePlate}) entrou na fila de qualidade.`,
        category: 'QUALIDADE',
        severity: 'INFO',
        relatedPath: '/quality',
        relatedId: order.id
      });
    }
  };

  const openAssignmentModal = (order: ServiceOrder) => {
    setAssignModalOs(order);
    setSelectedBoxCode(order.boxNumber || '');
    const currentMechs = order.assignedMechanics?.length
      ? order.assignedMechanics
      : order.mechanicResponsible
      ? [order.mechanicResponsible]
      : [];
    setSelectedMechanics(currentMechs);
  };

  const handleSaveAssignment = async () => {
    if (!assignModalOs) return;
    const now = new Date().toISOString();
    const primaryMech = selectedMechanics[0] || '';
    const timelineEvent = createOSTimelineEvent(
      'DISTRIBUIÇÃO DE BOX / MECÂNICO',
      `Box: ${selectedBoxCode || 'Sem box'} • Mecânicos: ${selectedMechanics.join(', ') || 'Não definido'}`,
      session?.realUsername || 'Diretoria',
      session?.role
    );
    const updated = orders.map((o) => {
      if (o.id === assignModalOs.id) {
        const nextOrder: ServiceOrder = {
          ...o,
          assignedMechanics: selectedMechanics,
          updatedAt: now,
          timeline: [timelineEvent, ...(o.timeline || [])]
        };
        if (selectedBoxCode) {
          nextOrder.boxNumber = selectedBoxCode;
        } else {
          delete nextOrder.boxNumber;
        }
        if (primaryMech) {
          nextOrder.mechanicResponsible = primaryMech;
        } else {
          delete nextOrder.mechanicResponsible;
        }
        return nextOrder;
      }

      // Free the selected box if another active OS was occupying it
      if (selectedBoxCode && o.boxNumber === selectedBoxCode && isActiveWorkshopStatus(o.status)) {
        const freedOrder: ServiceOrder = {
          ...o,
          updatedAt: now,
          timeline: [
            createOSTimelineEvent(
              'BOX REALOCADO',
              `${selectedBoxCode} liberado para OS #${assignModalOs.osNumber} (${assignModalOs.vehiclePlate})`,
              session?.realUsername || 'Diretoria',
              session?.role
            ),
            ...(o.timeline || [])
          ]
        };
        delete freedOrder.boxNumber;
        return freedOrder;
      }
      return o;
    });
    await persistOrdersAndBoxes(updated);
    appendAuditLog(
      tenant,
      session?.realUsername || 'Operador',
      'ATRIBUIU BOX/MECÂNICO',
      `OS #${assignModalOs.osNumber}`,
      `${selectedBoxCode || 'Pátio'} • ${selectedMechanics.join(', ')}`
    );
    setAssignModalOs(null);
  };

  const toggleBoxMaintenance = async (box: WorkshopBox) => {
    const nextStatus = box.status === 'MANUTENCAO' ? 'LIVRE' : 'MANUTENCAO';
    const nextBoxes = boxes.map((b) =>
      b.id === box.id ? { ...b, status: nextStatus as WorkshopBox['status'], updatedAt: new Date().toISOString() } : b
    );
    setBoxes(nextBoxes);
    if (syncData) await syncData('boxes', nextBoxes);
    else writeWorkshopData(tenant, 'boxes', nextBoxes);
  };

  const filteredActiveOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return orders.filter((o) => {
      if (!term) return true;
      return (
        o.vehiclePlate?.toLowerCase().includes(term) ||
        o.vehicleModel?.toLowerCase().includes(term) ||
        o.clientName?.toLowerCase().includes(term) ||
        o.osNumber?.toLowerCase().includes(term)
      );
    });
  }, [orders, searchTerm]);

  const stalledOrders = useMemo(
    () =>
      filteredActiveOrders
        .filter((o) => isActiveWorkshopStatus(o.status))
        .map((o) => ({ order: o, hours: getVehicleStalledHours(o) }))
        .sort((a, b) => b.hours - a.hours),
    [filteredActiveOrders]
  );

  const mechanicNames = useMemo(() => {
    const defaults = ['Eduardo Maciel', 'Thiago Rover', 'Equipe Mecânica'];
    const fromEmployees = employees.filter((e) => e.status === 'Ativo').map((e) => e.name);
    return Array.from(new Set([...fromEmployees, ...defaults]));
  }, [employees]);

  const mapColumnMatch = (colId: OSStatus, orderStatus: OSStatus) => {
    if (colId === OSStatus.AGUARDANDO_APROVACAO) {
      return [OSStatus.AGUARDANDO_APROVACAO, OSStatus.ORCAMENTO_ENVIADO, OSStatus.ORCAMENTO].includes(orderStatus);
    }
    if (colId === OSStatus.EM_SERVICO) {
      return [OSStatus.EM_SERVICO, OSStatus.EM_ANDAMENTO].includes(orderStatus);
    }
    return orderStatus === colId;
  };

  return (
    <div className="w-full max-w-[1400px] space-y-6 pb-28 p-2 sm:p-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 text-left">
        <div>
          <div className="flex items-center gap-2 text-[#FF2D55] text-[10px] font-black uppercase tracking-[0.25em]">
            <Kanban size={15} />
            <span>Módulo Pátio & Boxes • MM Car Auto Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase italic text-white mt-1">
            Quadro de Pátio, Boxes & Gargalos
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Movimentação de veículos entre etapas, ocupação dos boxes 01–08 e distribuição de mecânicos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowCheckin(true)}
            className="px-5 py-3 bg-[#FF2D55] hover:bg-[#ff1744] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
          >
            <Plus size={15} /> Entrada Rápida (Check-in)
          </button>
          <button
            onClick={loadAll}
            className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-white/10 overflow-x-auto">
          {[
            { id: 'KANBAN', label: 'Quadro de Pátio (Kanban)' },
            { id: 'BOXES', label: `Boxes & Elevadores (${boxes.filter((b) => b.status === 'OCUPADO').length}/${boxes.length})` },
            { id: 'GARGALOS', label: `Veículos Parados (${orders.filter((o) => isOrderStalled(o, 48)).length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id ? 'bg-[#FF2D55] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Filtrar placa, modelo ou OS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 outline-none focus:border-[#FF2D55]"
          />
        </div>
      </div>

      {/* TAB 1: KANBAN */}
      {activeTab === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-left">
          {KANBAN_COLUMNS.map((col, colIdx) => {
            const colOrders = filteredActiveOrders.filter((o) => mapColumnMatch(col.id, o.status));
            const prevCol = KANBAN_COLUMNS[colIdx - 1];
            const nextCol = KANBAN_COLUMNS[colIdx + 1];
            return (
              <div key={col.id} className="bg-zinc-950/90 border border-white/10 rounded-3xl p-4 flex flex-col gap-3 min-h-[280px]">
                <div className={`flex items-center justify-between pb-2.5 border-b border-white/5`}>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${col.accent.split(' ')[1]}`}>
                    {col.label}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-white font-mono text-[10px] font-black tabular-nums">
                    {colOrders.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {colOrders.length === 0 ? (
                    <div className="py-10 text-center text-zinc-600 text-[11px]">Nenhum veículo nesta etapa</div>
                  ) : (
                    colOrders.map((ord) => {
                      const stalled = isOrderStalled(ord, 48);
                      const hours = getVehicleStalledHours(ord);
                      const mechs = ord.assignedMechanics?.length
                        ? ord.assignedMechanics
                        : ord.mechanicResponsible
                        ? [ord.mechanicResponsible]
                        : [];

                      return (
                        <div
                          key={ord.id}
                          className={`p-4 rounded-2xl bg-black/70 border space-y-3 transition-all ${
                            ord.isRework
                              ? 'border-red-500/40'
                              : stalled
                              ? 'border-amber-500/40'
                              : 'border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-black text-[#FF2D55]">{ord.vehiclePlate}</span>
                                <span className="text-[10px] font-mono text-zinc-500">OS #{ord.osNumber}</span>
                              </div>
                              <p className="text-sm font-black text-white uppercase mt-0.5">{ord.vehicleModel}</p>
                              <p className="text-[10px] text-zinc-400">{ord.clientName}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-black text-zinc-300">
                                {ord.boxNumber || 'S/ BOX'}
                              </span>
                              {ord.isRework && (
                                <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[8px] font-black uppercase">
                                  RETRABALHO
                                </span>
                              )}
                              {stalled && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[8px] font-black font-mono tabular-nums">
                                  +{hours}h parado
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] text-zinc-300 line-clamp-2 bg-zinc-950 p-2.5 rounded-xl border border-white/5">
                            {ord.problem}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span>
                              Mecânico:{' '}
                              <strong className="text-white">
                                {mechs.length > 0 ? mechs.join(', ') : 'A atribuir'}
                              </strong>
                            </span>
                            <span className="font-mono tabular-nums text-emerald-400 font-bold">
                              R$ {(ord.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            {prevCol && (
                              <button
                                onClick={() => handleMoveStage(ord, prevCol.id)}
                                title={`Voltar para ${prevCol.label}`}
                                className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase text-zinc-300 flex items-center justify-center cursor-pointer"
                              >
                                <ArrowLeft size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => openAssignmentModal(ord)}
                              className="flex-1 py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase text-zinc-200 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <UserPlus size={12} /> Box / Mec.
                            </button>
                            {nextCol ? (
                              <button
                                onClick={() => handleMoveStage(ord, nextCol.id)}
                                className="flex-1 py-2 px-2.5 rounded-xl bg-[#FF2D55] hover:bg-[#ff1744] text-[9px] font-black uppercase text-white flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>Avançar</span> <ArrowRight size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMoveStage(ord, OSStatus.ENTREGUE)}
                                className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[9px] font-black uppercase text-black flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 size={12} /> <span>Entregar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: BOXES & ELEVADORES */}
      {activeTab === 'BOXES' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {boxes.map((box) => {
            const isOccupied = box.status === 'OCUPADO';
            const isMaint = box.status === 'MANUTENCAO';
            return (
              <div
                key={box.id}
                className={`p-5 rounded-3xl border flex flex-col justify-between space-y-4 ${
                  isOccupied
                    ? 'bg-[#FF2D55]/5 border-[#FF2D55]/35'
                    : isMaint
                    ? 'bg-amber-500/5 border-amber-500/35'
                    : 'bg-zinc-950 border-white/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black italic text-white">{box.code}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        isOccupied
                          ? 'bg-[#FF2D55]/20 text-[#FF2D55]'
                          : isMaint
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {box.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-400">{box.name}</p>

                  {isOccupied ? (
                    <div className="p-3 rounded-2xl bg-black/70 border border-white/10 space-y-1.5 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black text-white">{box.vehiclePlate}</span>
                        <span className="text-[10px] font-mono text-zinc-400">OS #{box.osNumber}</span>
                      </div>
                      <p className="text-xs font-bold text-zinc-300 truncate">{box.vehicleModel}</p>
                      <p className="text-[10px] text-zinc-400">Responsável: {box.mechanicName}</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-black/40 border border-dashed border-white/10 text-center text-[11px] text-zinc-500">
                      {isMaint ? 'Elevador em manutenção preventiva' : 'Disponível para próximo veículo'}
                    </div>
                  )}
                </div>

                {isOccupied ? (
                  <button
                    onClick={() => {
                      const ord = orders.find((o) => o.id === box.osId || o.boxNumber === box.code);
                      if (ord) openAssignmentModal(ord);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#FF2D55]/15 hover:bg-[#FF2D55] border border-[#FF2D55]/30 text-[9px] font-black uppercase tracking-wider text-[#FF2D55] hover:text-white transition-colors cursor-pointer"
                  >
                    Realocar / Liberar Box
                  </button>
                ) : (
                  <button
                    onClick={() => toggleBoxMaintenance(box)}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-wider text-zinc-300 cursor-pointer"
                  >
                    {isMaint ? 'Liberar Box' : 'Marcar Manutenção'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: VEÍCULOS PARADOS (GARGALOS) */}
      {activeTab === 'GARGALOS' && (
        <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black uppercase italic text-white">
                Relatório de Veículos Ativos por Tempo de Permanência
              </h3>
              <p className="text-xs text-zinc-400">
                Ordens com mais de 48h sem atualização são sinalizadas como gargalo operacional.
              </p>
            </div>
          </div>

          {stalledOrders.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">Nenhum veículo ativo no pátio.</div>
          ) : (
            <div className="space-y-3">
              {stalledOrders.map(({ order, hours }) => {
                const isCritical = hours >= 48;
                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCritical ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/60 border-white/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        {isCritical ? (
                          <AlertTriangle size={16} className="text-amber-400" />
                        ) : (
                          <Clock size={16} className="text-zinc-400" />
                        )}
                        <span className="text-sm font-black text-white uppercase">
                          {order.vehiclePlate} — {order.vehicleModel}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">OS #{order.osNumber}</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Cliente: {order.clientName} • Etapa: <strong className="text-white">{order.status}</strong> •{' '}
                        {order.boxNumber || 'Sem Box'} • Mecânico: {order.mechanicResponsible || 'Não atribuído'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-sm font-mono font-black tabular-nums ${isCritical ? 'text-amber-400' : 'text-zinc-200'}`}>
                          {hours}h sem atualização
                        </p>
                        <p className="text-[9px] text-zinc-500 uppercase">
                          {isCritical ? 'GARGALO CRÍTICO' : 'Dentro do prazo'}
                        </p>
                      </div>
                      <button
                        onClick={() => openAssignmentModal(order)}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-[#FF2D55] text-white text-[10px] font-black uppercase cursor-pointer whitespace-nowrap"
                      >
                        Redistribuir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL ATRIBUIÇÃO DE BOX & MÚLTIPLOS MECÂNICOS */}
      {assignModalOs && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-6 space-y-5 text-left">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#FF2D55]">
                DISTRIBUIÇÃO DE TRABALHO
              </span>
              <h3 className="text-lg font-black uppercase italic text-white mt-0.5">
                OS #{assignModalOs.osNumber} • {assignModalOs.vehiclePlate}
              </h3>
              <p className="text-xs text-zinc-400">{assignModalOs.vehicleModel}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-400 block">Selecionar Box / Elevador</label>
              <select
                value={selectedBoxCode}
                onChange={(e) => setSelectedBoxCode(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none"
              >
                <option value="">-- Pátio Geral (Sem Box Fixo) --</option>
                {boxes.map((b) => {
                  const isMaint = b.status === 'MANUTENCAO';
                  const occupiedByOther = b.status === 'OCUPADO' && b.osId !== assignModalOs.id;
                  return (
                    <option key={b.id} value={b.code} disabled={isMaint}>
                      {b.code} — {b.name} (
                      {isMaint
                        ? 'EM MANUTENÇÃO'
                        : occupiedByOther
                        ? `OCUPADO: ${b.vehiclePlate}`
                        : b.status}
                      )
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-400 block">
                Mecânicos Envolvidos (Múltipla Seleção)
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {mechanicNames.map((name) => {
                  const active = selectedMechanics.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() =>
                        setSelectedMechanics((prev) =>
                          prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
                        )
                      }
                      className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between cursor-pointer ${
                        active ? 'bg-[#FF2D55]/15 border-[#FF2D55] text-white' : 'bg-black border-white/10 text-zinc-400'
                      }`}
                    >
                      <span>{name}</span>
                      {active && <CheckCircle2 size={15} className="text-[#FF2D55]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAssignModalOs(null)}
                className="flex-1 py-3 rounded-xl bg-zinc-900 text-zinc-400 text-[10px] font-black uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAssignment}
                className="flex-1 py-3 rounded-xl bg-[#FF2D55] text-white text-[10px] font-black uppercase cursor-pointer"
              >
                Salvar Distribuição
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckin && (
        <PatioCheckinModal
          isOpen={showCheckin}
          onClose={() => setShowCheckin(false)}
          session={session}
          syncData={syncData}
          onSuccess={() => loadAll()}
        />
      )}
    </div>
  );
};

export default PatioBoard;
