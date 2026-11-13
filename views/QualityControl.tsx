import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, RotateCcw,
  Award, Wrench, Car, X
} from 'lucide-react';
import { ServiceOrder, OSStatus, UserSession, QualityInspection } from '../types';
import {
  readWorkshopData, writeWorkshopData, createOSTimelineEvent,
  appendAuditLog, pushSystemNotification
} from '../src/utils/workshopHelpers';

interface QualityControlProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const QualityControl: React.FC<QualityControlProps> = ({ session, syncData }) => {
  const tenant = session?.username || 'rafael';
  const [activeTab, setActiveTab] = useState<'INSPECTION' | 'WARRANTY' | 'REWORK'>('INSPECTION');
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [inspectingOs, setInspectingOs] = useState<ServiceOrder | null>(null);
  const [checks, setChecks] = useState({
    roadTestOk: true,
    torqueCheckOk: true,
    cleanlinessOk: true,
    lightsAndPanelOk: true,
    notes: '',
    reworkReason: ''
  });

  const loadOrders = () => {
    setOrders(readWorkshopData<ServiceOrder[]>(tenant, 'orders', []));
  };

  useEffect(() => {
    loadOrders();
    window.addEventListener('kaen_storage_updated', loadOrders);
    return () => window.removeEventListener('kaen_storage_updated', loadOrders);
  }, [tenant]);

  const persistOrders = async (updated: ServiceOrder[]) => {
    setOrders(updated);
    if (syncData) await syncData('orders', updated);
    else writeWorkshopData(tenant, 'orders', updated);
  };

  const inspectionQueue = useMemo(
    () => orders.filter((o) => o.status === OSStatus.FINALIZACAO),
    [orders]
  );

  const reworkOrders = useMemo(
    () => orders.filter((o) => o.isRework || (o.reworkCount || 0) > 0),
    [orders]
  );

  const warrantyOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.warrantyExpiresAt ||
          [OSStatus.PRONTO, OSStatus.ENTREGUE, OSStatus.FINALIZADO].includes(o.status)
      ),
    [orders]
  );

  const openInspection = (os: ServiceOrder) => {
    setInspectingOs(os);
    setChecks({
      roadTestOk: true,
      torqueCheckOk: true,
      cleanlinessOk: true,
      lightsAndPanelOk: true,
      notes: os.qualityInspection?.notes || '',
      reworkReason: ''
    });
  };

  const handleApproveQuality = async () => {
    if (!inspectingOs) return;
    const now = new Date();
    const warrantyDays = inspectingOs.warrantyDays || 90;
    const expires = new Date(now.getTime() + warrantyDays * 86400000).toISOString();

    const inspection: QualityInspection = {
      inspectedBy: session?.realUsername || 'Controle de Qualidade',
      inspectedAt: now.toISOString(),
      passed: true,
      roadTestOk: checks.roadTestOk,
      torqueCheckOk: checks.torqueCheckOk,
      cleanlinessOk: checks.cleanlinessOk,
      lightsAndPanelOk: checks.lightsAndPanelOk,
      notes: checks.notes || 'Aprovado na inspeção final MM Car Auto Center.'
    };

    const tl = createOSTimelineEvent(
      'INSPEÇÃO FINAL APROVADA',
      `Liberado para entrega com garantia de ${warrantyDays} dias. ${inspection.notes}`,
      session?.realUsername || 'Qualidade',
      session?.role
    );

    const updated = orders.map((o) =>
      o.id === inspectingOs.id
        ? {
            ...o,
            status: OSStatus.PRONTO,
            qualityInspection: inspection,
            warrantyDays,
            warrantyExpiresAt: expires,
            updatedAt: now.toISOString(),
            timeline: [tl, ...(o.timeline || [])]
          }
        : o
    );

    await persistOrders(updated);
    appendAuditLog(tenant, session?.realUsername || 'Qualidade', 'APROVOU QUALIDADE', `OS #${inspectingOs.osNumber}`, 'Liberado para entrega');
    pushSystemNotification(tenant, {
      title: `Veículo Pronto p/ Entrega — OS #${inspectingOs.osNumber}`,
      message: `${inspectingOs.vehicleModel} (${inspectingOs.vehiclePlate}) aprovado na qualidade. Avisar cliente ${inspectingOs.clientName}.`,
      category: 'QUALIDADE',
      severity: 'INFO',
      relatedPath: '/orders',
      relatedId: inspectingOs.id
    });
    setInspectingOs(null);
  };

  const handleRejectToRework = async () => {
    if (!inspectingOs) return;
    if (!checks.reworkReason.trim()) {
      alert('Informe o motivo técnico do retrabalho para enviar de volta ao mecânico.');
      return;
    }

    const now = new Date().toISOString();
    const nextCount = (inspectingOs.reworkCount || 0) + 1;
    const inspection: QualityInspection = {
      inspectedBy: session?.realUsername || 'Controle de Qualidade',
      inspectedAt: now,
      passed: false,
      roadTestOk: checks.roadTestOk,
      torqueCheckOk: checks.torqueCheckOk,
      cleanlinessOk: checks.cleanlinessOk,
      lightsAndPanelOk: checks.lightsAndPanelOk,
      notes: checks.notes,
      reworkReason: checks.reworkReason
    };

    const tl = createOSTimelineEvent(
      'RETRABALHO SOLICITADO',
      `Reprovado na inspeção final (#${nextCount}): ${checks.reworkReason}`,
      session?.realUsername || 'Qualidade',
      session?.role
    );

    const updated = orders.map((o) =>
      o.id === inspectingOs.id
        ? {
            ...o,
            status: OSStatus.EM_SERVICO,
            isRework: true,
            reworkCount: nextCount,
            reworkReason: checks.reworkReason,
            mechanicStatus: 'PAUSADO' as const,
            pauseReason: `Retrabalho: ${checks.reworkReason}`,
            qualityInspection: inspection,
            updatedAt: now,
            timeline: [tl, ...(o.timeline || [])]
          }
        : o
    );

    await persistOrders(updated);
    appendAuditLog(tenant, session?.realUsername || 'Qualidade', 'ABRIU RETRABALHO', `OS #${inspectingOs.osNumber}`, checks.reworkReason);
    pushSystemNotification(tenant, {
      title: `Retrabalho na OS #${inspectingOs.osNumber}`,
      message: `${inspectingOs.vehiclePlate} retornou ao box: ${checks.reworkReason}`,
      category: 'MECANICO',
      severity: 'WARNING',
      relatedPath: '/terminal',
      relatedId: inspectingOs.id
    });
    setInspectingOs(null);
  };

  const handleWarrantyReturn = async (os: ServiceOrder) => {
    const reason = prompt(`Descreva a ocorrência de retorno em garantia para a OS #${os.osNumber} (${os.vehiclePlate}):`);
    if (!reason || !reason.trim()) return;
    const now = new Date().toISOString();
    const tl = createOSTimelineEvent(
      'RETORNO EM GARANTIA',
      `Veículo retornou em garantia: ${reason}`,
      session?.realUsername || 'Recepção',
      session?.role
    );
    const updated = orders.map((o) =>
      o.id === os.id
        ? {
            ...o,
            status: OSStatus.EM_DIAGNOSTICO,
            isRework: true,
            reworkCount: (o.reworkCount || 0) + 1,
            reworkReason: `Garantia: ${reason}`,
            updatedAt: now,
            timeline: [tl, ...(o.timeline || [])]
          }
        : o
    );
    await persistOrders(updated);
    appendAuditLog(tenant, session?.realUsername || 'Recepção', 'RETORNO GARANTIA', `OS #${os.osNumber}`, reason);
  };

  return (
    <div className="w-full max-w-[1300px] space-y-6 pb-28 p-2 sm:p-6 animate-in fade-in duration-300 text-left">
      <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-[0.25em]">
            <ShieldCheck size={15} />
            <span>Módulo 10 • Qualidade, Retrabalho & Garantias</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase italic text-white mt-1">
            Inspeção Final & Gestão de Garantias
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Validação técnica obrigatória antes da entrega ao cliente, controle de retrabalho e garantias de 90 dias.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-black/60 border border-white/10 text-center">
            <span className="text-[9px] font-black text-zinc-500 uppercase block">Fila Inspeção</span>
            <span className="text-xl font-black text-cyan-400 tabular-nums">{inspectionQueue.length}</span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-black/60 border border-white/10 text-center">
            <span className="text-[9px] font-black text-zinc-500 uppercase block">Retrabalhos</span>
            <span className="text-xl font-black text-amber-400 tabular-nums">{reworkOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-white/10 w-fit overflow-x-auto">
        {[
          { id: 'INSPECTION', label: `Inspeção Final (${inspectionQueue.length})` },
          { id: 'WARRANTY', label: `Garantias Ativas (${warrantyOrders.length})` },
          { id: 'REWORK', label: `Controle de Retrabalho (${reworkOrders.length})` }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer whitespace-nowrap ${
              activeTab === t.id ? 'bg-[#FF2D55] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'INSPECTION' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inspectionQueue.length === 0 ? (
            <div className="col-span-full p-12 rounded-3xl bg-zinc-950/60 border border-dashed border-white/10 text-center space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400 opacity-70" />
              <p className="text-sm font-black uppercase text-zinc-300">Nenhum veículo aguardando inspeção final</p>
              <p className="text-xs text-zinc-500">Quando um mecânico finalizar o serviço no Terminal, a OS aparecerá aqui.</p>
            </div>
          ) : (
            inspectionQueue.map((os) => (
              <div key={os.id} className="p-5 rounded-3xl bg-zinc-950 border border-cyan-500/25 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-black text-cyan-400">OS #{os.osNumber} • FINALIZAÇÃO</span>
                    <h3 className="text-lg font-black text-white uppercase mt-0.5">
                      {os.vehiclePlate} — {os.vehicleModel}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Cliente: {os.clientName} • Mecânico: {os.mechanicResponsible || 'Equipe'}
                    </p>
                  </div>
                  {os.isRework && (
                    <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-[9px] font-black uppercase">
                      Retrabalho #{os.reworkCount}
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-300 bg-black/60 p-3 rounded-xl border border-white/5">{os.problem}</p>

                <button
                  onClick={() => openInspection(os)}
                  className="w-full py-3 rounded-2xl bg-[#FF2D55] hover:bg-[#ff1744] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck size={16} /> Realizar Inspeção de Qualidade
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'WARRANTY' && (
        <div className="space-y-3">
          {warrantyOrders.length === 0 ? (
            <div className="p-12 rounded-3xl bg-zinc-950/60 border border-dashed border-white/10 text-center text-xs text-zinc-500">
              Nenhuma garantia registrada ainda.
            </div>
          ) : (
            warrantyOrders.map((os) => {
              const expDate = os.warrantyExpiresAt
                ? new Date(os.warrantyExpiresAt)
                : new Date(new Date(os.updatedAt || os.createdAt).getTime() + 90 * 86400000);
              const isValid = expDate >= new Date();
              return (
                <div key={os.id} className="p-4 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Award size={15} className={isValid ? 'text-emerald-400' : 'text-zinc-500'} />
                      <span className="text-xs font-mono font-black text-white">OS #{os.osNumber}</span>
                      <span className="text-xs font-black text-[#FF2D55]">{os.vehiclePlate}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${isValid ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        {isValid ? 'GARANTIA ATIVA' : 'EXPIRADA'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-zinc-300">
                      {os.vehicleModel} • Cliente: {os.clientName}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Válida até {expDate.toLocaleDateString('pt-BR')} ({os.warrantyDays || 90} dias) • Serviço: {os.problem}
                    </p>
                  </div>

                  <button
                    onClick={() => handleWarrantyReturn(os)}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw size={13} /> Acionar Garantia
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'REWORK' && (
        <div className="space-y-3">
          {reworkOrders.length === 0 ? (
            <div className="p-12 rounded-3xl bg-zinc-950/60 border border-dashed border-white/10 text-center text-xs text-zinc-500">
              Zero registros de retrabalho — índice de qualidade em 100%.
            </div>
          ) : (
            reworkOrders.map((os) => (
              <div key={os.id} className="p-4 rounded-2xl bg-red-950/15 border border-red-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-red-400" />
                    <span className="text-xs font-mono font-black text-white">OS #{os.osNumber}</span>
                    <span className="text-xs font-black text-red-400">{os.vehiclePlate}</span>
                    <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-[9px] font-black uppercase">
                      {os.reworkCount || 1}x Retrabalho
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-300">
                    {os.vehicleModel} • Mecânico: {os.mechanicResponsible || 'Não definido'}
                  </p>
                  <p className="text-[11px] text-red-300">Motivo: {os.reworkReason || 'Ajuste pós-inspeção'}</p>
                </div>
                <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-xl bg-black/50 text-zinc-300">
                  Status Atual: {os.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL INSPEÇÃO FINAL */}
      {inspectingOs && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl p-6 space-y-4 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                  VALIDAÇÃO FINAL DE QUALIDADE
                </span>
                <h3 className="text-lg font-black uppercase italic text-white">
                  OS #{inspectingOs.osNumber} • {inspectingOs.vehiclePlate}
                </h3>
              </div>
              <button onClick={() => setInspectingOs(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { key: 'roadTestOk', label: 'Teste de rodagem / funcionamento aprovado sem ruídos' },
                { key: 'torqueCheckOk', label: 'Conferência de aperto, fluidos e ferramentas removidas' },
                { key: 'cleanlinessOk', label: 'Veículo limpo (interior e exterior preservados)' },
                { key: 'lightsAndPanelOk', label: 'Painel sem luzes de advertência e iluminação OK' }
              ].map((item) => {
                const checked = (checks as any)[item.key] as boolean;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setChecks((prev) => ({ ...prev, [item.key]: !checked }))}
                    className={`w-full p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between cursor-pointer ${
                      checked ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-black border-white/10 text-zinc-400'
                    }`}
                  >
                    <span>{item.label}</span>
                    <CheckCircle2 size={16} className={checked ? 'text-emerald-400' : 'text-zinc-600'} />
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-400 block">Observações da Qualidade</label>
              <textarea
                rows={2}
                value={checks.notes}
                onChange={(e) => setChecks((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Anotações de conferência técnica..."
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1.5 p-3 rounded-2xl bg-red-950/15 border border-red-500/20">
              <label className="text-[10px] font-black uppercase text-red-400 block">
                Se reprovar: Motivo do Retrabalho
              </label>
              <input
                type="text"
                value={checks.reworkReason}
                onChange={(e) => setChecks((prev) => ({ ...prev, reworkReason: e.target.value }))}
                placeholder="Ex: Ruído residual na pinça dianteira esquerda..."
                className="w-full bg-black border border-red-500/20 rounded-xl p-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={handleRejectToRework}
                className="flex-1 py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} /> Reprovar (Retrabalho)
              </button>
              <button
                onClick={handleApproveQuality}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={14} /> Aprovar & Liberar Entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityControl;
