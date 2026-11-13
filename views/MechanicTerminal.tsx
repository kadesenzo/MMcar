import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench, Car, Play, Pause, CheckCircle2, Search, PackagePlus,
  AlertTriangle, X, HelpCircle, Camera, Clock, MessageSquarePlus,
  Send, MapPin, ClipboardCheck, ShieldAlert, Plus
} from 'lucide-react';
import {
  Client, Vehicle, ServiceOrder, OSStatus, PaymentStatus,
  UserSession, Part, PartRequest, MechanicWorkLog
} from '../types';
import AntesEDepoisModal from '../components/AntesEDepoisModal';
import {
  readWorkshopData, writeWorkshopData, createOSTimelineEvent,
  pushSystemNotification, appendAuditLog, isActiveWorkshopStatus,
  PATIO_CHECKLIST_CATEGORIES, createDefaultPatioCategories
} from '../src/utils/workshopHelpers';

interface MechanicTerminalProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const PAUSE_REASONS = [
  'Aguardando peça do estoque / fornecedor',
  'Aguardando aprovação do orçamento pelo cliente',
  'Aguardando ferramenta especial ou scanner',
  'Intervalo / Troca de turno',
  'Priorização de outro veículo urgente'
];

const MechanicTerminal: React.FC<MechanicTerminalProps> = ({ session, syncData }) => {
  const tenant = session?.username || 'rafael';
  const mechanicName = session?.activeUser || session?.username || 'Mecânico';

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [activeTab, setActiveTab] = useState<'MINHAS_OS' | 'OFICINA' | 'VISTORIA'>('MINHAS_OS');
  const [selectedOsId, setSelectedOsId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Action Modals
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState(PAUSE_REASONS[0]);
  const [customPauseReason, setCustomPauseReason] = useState('');

  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityNote, setActivityNote] = useState('');

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');

  const [showPartReqModal, setShowPartReqModal] = useState(false);
  const [partQuery, setPartQuery] = useState('');
  const [selectedCatalogPart, setSelectedCatalogPart] = useState<Part | null>(null);
  const [reqPartName, setReqPartName] = useState('');
  const [reqQty, setReqQty] = useState('1');
  const [reqUrgency, setReqUrgency] = useState<'NORMAL' | 'URGENTE'>('NORMAL');
  const [reqNotes, setReqNotes] = useState('');

  const [showAntesDepoisModal, setShowAntesDepoisModal] = useState(false);
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
  const [quickPlate, setQuickPlate] = useState('');
  const [quickModel, setQuickModel] = useState('');
  const [quickClient, setQuickClient] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickProblem, setQuickProblem] = useState('');

  const [nowTick, setNowTick] = useState(Date.now());
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const loadAll = () => {
    setOrders(readWorkshopData<ServiceOrder[]>(tenant, 'orders', []));
    setParts(readWorkshopData<Part[]>(tenant, 'parts', []));
    setPartRequests(readWorkshopData<PartRequest[]>(tenant, 'part_requests', []));
    setVehicles(readWorkshopData<Vehicle[]>(tenant, 'vehicles', []));
    setClients(readWorkshopData<Client[]>(tenant, 'clients', []));
  };

  useEffect(() => {
    loadAll();
    window.addEventListener('kaen_storage_updated', loadAll);
    return () => window.removeEventListener('kaen_storage_updated', loadAll);
  }, [tenant]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const notifyLocal = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const persistOrders = async (next: ServiceOrder[]) => {
    setOrders(next);
    writeWorkshopData(tenant, 'orders', next);
    if (syncData) await syncData('orders', next);
  };

  const persistPartRequests = async (next: PartRequest[]) => {
    setPartRequests(next);
    writeWorkshopData(tenant, 'part_requests', next);
    if (syncData) await syncData('part_requests', next);
  };

  const activeOrders = useMemo(
    () => orders.filter(o => isActiveWorkshopStatus(o.status)),
    [orders]
  );

  const myOrders = useMemo(() => {
    const norm = mechanicName.toLowerCase();
    return activeOrders.filter(o => {
      const assigned = (o.assignedMechanics || []).some(m => m.toLowerCase() === norm);
      const resp = (o.mechanicResponsible || '').toLowerCase() === norm;
      return assigned || resp;
    });
  }, [activeOrders, mechanicName]);

  const displayedOrders = useMemo(() => {
    const base = activeTab === 'MINHAS_OS' ? (myOrders.length > 0 ? myOrders : activeOrders) : activeOrders;
    if (!searchTerm.trim()) return base;
    const q = searchTerm.toLowerCase();
    return base.filter(
      o =>
        (o.vehiclePlate || '').toLowerCase().includes(q) ||
        (o.vehicleModel || '').toLowerCase().includes(q) ||
        (o.clientName || '').toLowerCase().includes(q) ||
        (o.osNumber || '').includes(q)
    );
  }, [activeTab, myOrders, activeOrders, searchTerm]);

  const selectedOs = useMemo(
    () => orders.find(o => o.id === selectedOsId) || null,
    [orders, selectedOsId]
  );

  const getElapsedMinutes = (os: ServiceOrder) => {
    const base = os.accumulatedMinutes || 0;
    if (os.mechanicStatus === 'EM_EXECUCAO' && os.workStartedAt) {
      const diff = Math.max(0, Math.floor((nowTick - new Date(os.workStartedAt).getTime()) / 60000));
      return base + diff;
    }
    return base;
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  const handleStartOrResume = async (os: ServiceOrder) => {
    const isResuming = os.mechanicStatus === 'PAUSADO';
    const log: MechanicWorkLog = {
      id: `mwl-${Date.now()}`,
      mechanicName,
      action: isResuming ? 'RETOMOU' : 'INICIOU',
      timestamp: new Date().toISOString()
    };
    const nextMechanics = Array.from(new Set([...(os.assignedMechanics || []), mechanicName]));
    const updated = orders.map(item =>
      item.id === os.id
        ? {
            ...item,
            status: OSStatus.EM_SERVICO,
            mechanicResponsible: item.mechanicResponsible || mechanicName,
            assignedMechanics: nextMechanics,
            mechanicStatus: 'EM_EXECUCAO' as const,
            pauseReason: undefined,
            workStartedAt: new Date().toISOString(),
            mechanicWorkLogs: [log, ...(item.mechanicWorkLogs || [])],
            timeline: [
              createOSTimelineEvent(
                isResuming ? 'SERVICO_RETOMADO' : 'SERVICO_INICIADO',
                `${mechanicName} ${isResuming ? 'retomou' : 'iniciou'} a execução na OS #${os.osNumber}`,
                mechanicName,
                session?.role
              ),
              ...(item.timeline || [])
            ],
            updatedAt: new Date().toISOString()
          }
        : item
    );
    await persistOrders(updated);
    notifyLocal(`${isResuming ? 'Serviço retomado' : 'Cronômetro iniciado'} na OS #${os.osNumber}!`);
  };

  const handleConfirmPause = async () => {
    if (!selectedOs) return;
    const finalReason = customPauseReason.trim() || pauseReason;
    const totalMins = getElapsedMinutes(selectedOs);
    const log: MechanicWorkLog = {
      id: `mwl-${Date.now()}`,
      mechanicName,
      action: 'PAUSOU',
      reason: finalReason,
      elapsedMinutes: totalMins,
      timestamp: new Date().toISOString()
    };

    const updated = orders.map(item =>
      item.id === selectedOs.id
        ? {
            ...item,
            mechanicStatus: 'PAUSADO' as const,
            pauseReason: finalReason,
            workStartedAt: undefined,
            accumulatedMinutes: totalMins,
            mechanicWorkLogs: [log, ...(item.mechanicWorkLogs || [])],
            timeline: [
              createOSTimelineEvent(
                'SERVICO_PAUSADO',
                `${mechanicName} pausou o serviço. Motivo: ${finalReason}`,
                mechanicName,
                session?.role
              ),
              ...(item.timeline || [])
            ],
            updatedAt: new Date().toISOString()
          }
        : item
    );
    await persistOrders(updated);
    setShowPauseModal(false);
    setCustomPauseReason('');
    notifyLocal(`Serviço pausado: ${finalReason}`);
  };

  const handleSaveActivity = async () => {
    if (!selectedOs || !activityNote.trim()) return;
    const log: MechanicWorkLog = {
      id: `mwl-${Date.now()}`,
      mechanicName,
      action: 'ATIVIDADE',
      notes: activityNote.trim(),
      timestamp: new Date().toISOString()
    };
    const updated = orders.map(item =>
      item.id === selectedOs.id
        ? {
            ...item,
            diagnosticNotes: item.diagnosticNotes
              ? `${item.diagnosticNotes}\n[${mechanicName}]: ${activityNote.trim()}`
              : `[${mechanicName}]: ${activityNote.trim()}`,
            mechanicWorkLogs: [log, ...(item.mechanicWorkLogs || [])],
            timeline: [
              createOSTimelineEvent(
                'ATIVIDADE_MECANICO',
                `${mechanicName}: ${activityNote.trim()}`,
                mechanicName,
                session?.role
              ),
              ...(item.timeline || [])
            ],
            updatedAt: new Date().toISOString()
          }
        : item
    );
    await persistOrders(updated);
    setShowActivityModal(false);
    setActivityNote('');
    notifyLocal('Atividade técnica registrada na OS!');
  };

  const handleSendHelpRequest = async () => {
    if (!selectedOs || !helpMessage.trim()) return;
    const log: MechanicWorkLog = {
      id: `mwl-${Date.now()}`,
      mechanicName,
      action: 'AJUDA',
      notes: helpMessage.trim(),
      timestamp: new Date().toISOString()
    };
    const updated = orders.map(item =>
      item.id === selectedOs.id
        ? {
            ...item,
            mechanicWorkLogs: [log, ...(item.mechanicWorkLogs || [])],
            timeline: [
              createOSTimelineEvent(
                'PEDIDO_AJUDA_TECNICA',
                `${mechanicName} solicitou suporte técnico: ${helpMessage.trim()}`,
                mechanicName,
                session?.role
              ),
              ...(item.timeline || [])
            ],
            updatedAt: new Date().toISOString()
          }
        : item
    );
    await persistOrders(updated);
    pushSystemNotification(tenant, {
      title: `Ajuda Técnica • ${selectedOs.vehiclePlate} (${selectedOs.boxNumber || 'Pátio'})`,
      message: `${mechanicName} na OS #${selectedOs.osNumber}: "${helpMessage.trim()}"`,
      category: 'MECANICO',
      severity: 'CRITICAL',
      targetRoles: ['Dono', 'Gerente'],
      relatedPath: '/patio',
      relatedId: selectedOs.id
    });
    setShowHelpModal(false);
    setHelpMessage('');
    notifyLocal('Pedido de ajuda técnica enviado à Diretoria/Gerência!');
  };

  const handleSubmitPartRequest = async () => {
    if (!selectedOs) return;
    const partNameFinal = (selectedCatalogPart?.name || reqPartName).trim().toUpperCase();
    if (!partNameFinal) return;
    const qty = Math.max(1, parseInt(reqQty, 10) || 1);

    const newReq: PartRequest = {
      id: `preq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      osId: selectedOs.id,
      osNumber: selectedOs.osNumber,
      vehiclePlate: selectedOs.vehiclePlate,
      vehicleModel: selectedOs.vehicleModel,
      mechanicName,
      partId: selectedCatalogPart?.id,
      partName: partNameFinal,
      sku: selectedCatalogPart?.sku,
      quantity: qty,
      urgency: reqUrgency,
      notes: reqNotes.trim() || undefined,
      status: 'PENDENTE',
      requestedAt: new Date().toISOString()
    };

    const nextRequests = [newReq, ...partRequests];
    await persistPartRequests(nextRequests);

    const updatedOrders = orders.map(item =>
      item.id === selectedOs.id
        ? {
            ...item,
            timeline: [
              createOSTimelineEvent(
                'PECA_SOLICITADA',
                `${mechanicName} solicitou ao estoque: ${qty}x ${partNameFinal} (${reqUrgency})`,
                mechanicName,
                session?.role
              ),
              ...(item.timeline || [])
            ],
            updatedAt: new Date().toISOString()
          }
        : item
    );
    await persistOrders(updatedOrders);

    pushSystemNotification(tenant, {
      title: `${reqUrgency === 'URGENTE' ? 'URGENTE: ' : ''}Solicitação de Peça • ${selectedOs.vehiclePlate}`,
      message: `${mechanicName} pediu ${qty}x ${partNameFinal} para OS #${selectedOs.osNumber}`,
      category: 'ESTOQUE',
      severity: reqUrgency === 'URGENTE' ? 'CRITICAL' : 'WARNING',
      targetRoles: ['Estoque', 'Dono', 'Gerente'],
      relatedPath: '/inventory',
      relatedId: newReq.id
    });

    setShowPartReqModal(false);
    setSelectedCatalogPart(null);
    setReqPartName('');
    setPartQuery('');
    setReqQty('1');
    setReqUrgency('NORMAL');
    setReqNotes('');
    notifyLocal(`Peça "${partNameFinal}" solicitada ao setor de Estoque!`);
  };

  const handleFinishWorkToQuality = async (os: ServiceOrder) => {
    const totalMins = getElapsedMinutes(os);
    const log: MechanicWorkLog = {
      id: `mwl-${Date.now()}`,
      mechanicName,
      action: 'FINALIZOU',
      elapsedMinutes: totalMins,
      timestamp: new Date().toISOString()
    };
    const updated = orders.map(item =>
      item.id === os.id
        ? {
            ...item,
            status: OSStatus.FINALIZACAO,
            mechanicStatus: 'CONCLUIDO' as const,
            workStartedAt: undefined,
            accumulatedMinutes: totalMins,
            isRework: false,
            mechanicWorkLogs: [log, ...(item.mechanicWorkLogs || [])],
            timeline: [
              createOSTimelineEvent(
                'ENVIADO_INSPECAO_FINAL',
                `${mechanicName} concluiu a execução (${formatDuration(totalMins)}) e enviou para Inspeção Final de Qualidade`,
                mechanicName,
                session?.role
              ),
              ...(item.timeline || [])
            ],
            updatedAt: new Date().toISOString()
          }
        : item
    );
    await persistOrders(updated);
    pushSystemNotification(tenant, {
      title: `Aguardando Inspeção Final • ${os.vehiclePlate}`,
      message: `${mechanicName} finalizou a OS #${os.osNumber}. Realize a checagem de qualidade.`,
      category: 'QUALIDADE',
      severity: 'INFO',
      targetRoles: ['Dono', 'Gerente', 'Recepção'],
      relatedPath: '/quality',
      relatedId: os.id
    });
    appendAuditLog(tenant, mechanicName, 'FINALIZOU_EXECUCAO_OS', `OS #${os.osNumber}`, `Tempo: ${formatDuration(totalMins)}`);
    setSelectedOsId(null);
    notifyLocal(`OS #${os.osNumber} enviada para Inspeção Final de Qualidade!`);
  };

  const handleQuickCreateService = async () => {
    if (!quickPlate.trim() || !quickModel.trim() || !quickProblem.trim()) return;
    const plate = quickPlate.trim().toUpperCase();
    const clientId = `cli-${Date.now()}`;
    const newCli: Client = {
      id: clientId,
      name: (quickClient.trim() || 'Cliente Balcão').toUpperCase(),
      phone: quickPhone.trim() || '(00) 00000-0000',
      document: '---',
      observations: 'Entrada rápida via Terminal do Mecânico',
      createdAt: new Date().toISOString()
    };
    const nextClients = [...clients, newCli];
    setClients(nextClients);
    writeWorkshopData(tenant, 'clients', nextClients);
    if (syncData) await syncData('clients', nextClients);

    const vehId = `veh-${Date.now()}`;
    const newVeh: Vehicle = {
      id: vehId,
      clientId,
      plate,
      model: quickModel.trim().toUpperCase(),
      brand: '---',
      year: '---',
      km: 0
    };
    const nextVehicles = [...vehicles, newVeh];
    setVehicles(nextVehicles);
    writeWorkshopData(tenant, 'vehicles', nextVehicles);
    if (syncData) await syncData('vehicles', nextVehicles);

    const osNumber = `${Math.floor(100000 + Math.random() * 899999)}`;
    const newOs: ServiceOrder = {
      id: `os-${Date.now()}`,
      osNumber,
      clientId,
      clientName: newCli.name,
      clientPhone: newCli.phone,
      vehicleId: vehId,
      vehiclePlate: plate,
      vehicleModel: newVeh.model,
      problem: quickProblem.trim(),
      diagnosticNotes: quickProblem.trim(),
      items: [],
      laborValue: 0,
      discount: 0,
      totalValue: 0,
      status: OSStatus.EM_SERVICO,
      paymentStatus: PaymentStatus.PENDENTE,
      mechanicResponsible: mechanicName,
      assignedMechanics: [mechanicName],
      mechanicStatus: 'EM_EXECUCAO',
      workStartedAt: new Date().toISOString(),
      accumulatedMinutes: 0,
      checklist: {
        fuelLevel: '1/2',
        damages: [],
        items: {},
        categories: createDefaultPatioCategories(),
        observations: 'Aberto diretamente no Terminal do Mecânico'
      },
      timeline: [
        createOSTimelineEvent('ABERTURA_RAPIDA_MECANICO', `OS #${osNumber} aberta e iniciada por ${mechanicName}`, mechanicName, session?.role)
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const nextOrders = [newOs, ...orders];
    await persistOrders(nextOrders);
    setShowQuickCreateModal(false);
    setQuickPlate('');
    setQuickModel('');
    setQuickClient('');
    setQuickPhone('');
    setQuickProblem('');
    setSelectedOsId(newOs.id);
    notifyLocal(`OS #${osNumber} criada e iniciada!`);
  };

  const osRequests = useMemo(
    () => (selectedOs ? partRequests.filter(r => r.osId === selectedOs.id) : []),
    [partRequests, selectedOs]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6 pb-32 animate-in fade-in duration-300">
      {/* Feedback Toast */}
      {feedbackBanner && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-bold flex items-center justify-between">
          <span>{feedbackBanner}</span>
          <button onClick={() => setFeedbackBanner(null)} className="cursor-pointer"><X size={16} /></button>
        </div>
      )}

      {/* Mobile-first Welcome Header */}
      <div className="bg-zinc-950 border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF2D55] block">
            Módulo 04 • Terminal do Mecânico
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-0.5">
            BEM-VINDO, <span className="text-[#FF2D55]">{mechanicName.toUpperCase()}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-semibold">
            {myOrders.length} {myOrders.length === 1 ? 'Ordem atribuída a você' : 'Ordens atribuídas a você'} • {activeOrders.length} veículos ativos no pátio
          </p>
        </div>

        <button
          onClick={() => setShowQuickCreateModal(true)}
          className="px-5 py-3.5 bg-[#FF2D55] hover:bg-[#e02448] text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} /> Abrir OS Rápida
        </button>
      </div>

      {/* Mode Switcher */}
      {!selectedOs && (
        <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('MINHAS_OS')}
            className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
              activeTab === 'MINHAS_OS' ? 'bg-[#FF2D55] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Minhas OS ({myOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('OFICINA')}
            className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
              activeTab === 'OFICINA' ? 'bg-[#FF2D55] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas no Pátio ({activeOrders.length})
          </button>
        </div>
      )}

      {/* LIST VIEW */}
      {!selectedOs ? (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar placa, modelo, cliente ou OS..."
              className="w-full bg-zinc-950 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
            />
          </div>

          {displayedOrders.length === 0 ? (
            <div className="p-12 text-center bg-zinc-950 border border-dashed border-white/10 rounded-3xl space-y-2">
              <Wrench size={32} className="mx-auto text-zinc-700" />
              <p className="text-sm font-bold text-zinc-400">Nenhuma Ordem de Serviço ativa encontrada.</p>
              <p className="text-xs text-zinc-600">Aguarde a recepção atribuir um veículo ou abra uma OS rápida.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {displayedOrders.map(os => {
                const elapsed = getElapsedMinutes(os);
                const pendingParts = partRequests.filter(r => r.osId === os.id && r.status === 'PENDENTE').length;
                return (
                  <button
                    key={os.id}
                    onClick={() => setSelectedOsId(os.id)}
                    className="w-full text-left bg-zinc-950 hover:bg-zinc-900 border border-white/10 hover:border-[#FF2D55]/50 rounded-3xl p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                          OS #{os.osNumber}
                        </span>
                        <span className="text-lg font-black text-white font-mono">{os.vehiclePlate}</span>
                        {os.boxNumber && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/25">
                            {os.boxNumber}
                          </span>
                        )}
                        {os.isRework && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                            RETRABALHO
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-zinc-300 uppercase">{os.vehicleModel} • {os.clientName}</p>
                      <p className="text-xs text-zinc-500 line-clamp-1">{os.problem}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {pendingParts > 0 && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {pendingParts} peça(s) pendente(s)
                        </span>
                      )}
                      <div className="text-right">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border block ${
                            os.mechanicStatus === 'EM_EXECUCAO'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : os.mechanicStatus === 'PAUSADO'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-zinc-800 text-zinc-300 border-white/10'
                          }`}
                        >
                          {os.mechanicStatus === 'EM_EXECUCAO'
                            ? 'Em Execução'
                            : os.mechanicStatus === 'PAUSADO'
                              ? 'Pausado'
                              : os.status}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 mt-1 block">
                          Tempo: {formatDuration(elapsed)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* EXECUTION VIEW FOR SELECTED OS */
        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
          {/* Selected OS Header Card */}
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-black text-[#FF2D55] bg-[#FF2D55]/10 px-2.5 py-1 rounded-lg border border-[#FF2D55]/25">
                    OS #{selectedOs.osNumber}
                  </span>
                  {selectedOs.boxNumber && (
                    <span className="text-xs font-black text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/25 flex items-center gap-1">
                      <MapPin size={12} /> {selectedOs.boxNumber}
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-zinc-400">
                    KM: {selectedOs.vehicleKm ? Number(selectedOs.vehicleKm).toLocaleString('pt-BR') : '---'}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white uppercase mt-2">
                  {selectedOs.vehiclePlate} — {selectedOs.vehicleModel}
                </h2>
                <p className="text-xs text-zinc-400">Cliente: <strong className="text-zinc-200">{selectedOs.clientName}</strong></p>
              </div>

              <button
                onClick={() => setSelectedOsId(null)}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {selectedOs.isRework && (
              <div className="p-4 bg-red-500/15 border border-red-500/40 rounded-2xl flex items-start gap-3">
                <ShieldAlert size={20} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black uppercase text-red-400">Atenção: Retorno de Inspeção / Retrabalho</p>
                  <p className="text-xs text-red-200 mt-0.5">{selectedOs.reworkReason || 'Ajuste solicitado pelo controle de qualidade.'}</p>
                </div>
              </div>
            )}

            {/* Timer & Status */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-black/60 p-4 rounded-2xl border border-white/10">
              <div>
                <span className="text-[9px] font-black uppercase text-zinc-500 block">Status Execução</span>
                <span className={`text-xs font-black uppercase ${
                  selectedOs.mechanicStatus === 'EM_EXECUCAO' ? 'text-emerald-400' :
                  selectedOs.mechanicStatus === 'PAUSADO' ? 'text-amber-400' : 'text-zinc-300'
                }`}>
                  {selectedOs.mechanicStatus === 'EM_EXECUCAO' ? 'Em Execução' : selectedOs.mechanicStatus === 'PAUSADO' ? 'Pausado' : 'Aguardando Início'}
                </span>
                {selectedOs.pauseReason && (
                  <span className="text-[10px] text-amber-300 block mt-0.5">{selectedOs.pauseReason}</span>
                )}
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-zinc-500 block">Tempo Apontado</span>
                <span className="text-lg font-black text-white font-mono tabular-nums flex items-center gap-1.5">
                  <Clock size={16} className="text-[#FF2D55]" />
                  {formatDuration(getElapsedMinutes(selectedOs))}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[9px] font-black uppercase text-zinc-500 block">Problema / Escopo</span>
                <p className="text-xs text-zinc-300 line-clamp-2">{selectedOs.problem}</p>
              </div>
            </div>

            {/* Primary Big Touch Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedOs.mechanicStatus !== 'EM_EXECUCAO' ? (
                <button
                  onClick={() => handleStartOrResume(selectedOs)}
                  className="py-4 px-5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play size={18} /> {selectedOs.mechanicStatus === 'PAUSADO' ? 'Retomar Serviço' : 'Iniciar Serviço'}
                </button>
              ) : (
                <button
                  onClick={() => setShowPauseModal(true)}
                  className="py-4 px-5 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Pause size={18} /> Pausar (Com Motivo)
                </button>
              )}

              <button
                onClick={() => handleFinishWorkToQuality(selectedOs)}
                className="py-4 px-5 bg-[#FF2D55] hover:bg-[#e02448] text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={18} /> Finalizar (Enviar p/ Qualidade)
              </button>
            </div>

            {/* Secondary Tool Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => setShowPartReqModal(true)}
                className="py-3.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-2xl text-[11px] font-black uppercase text-amber-400 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <PackagePlus size={18} /> Pedir Peça
              </button>
              <button
                onClick={() => setShowActivityModal(true)}
                className="py-3.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-2xl text-[11px] font-black uppercase text-sky-400 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquarePlus size={18} /> Registrar Atividade
              </button>
              <button
                onClick={() => setShowHelpModal(true)}
                className="py-3.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-2xl text-[11px] font-black uppercase text-red-400 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <HelpCircle size={18} /> Pedir Ajuda
              </button>
              <button
                onClick={() => setShowAntesDepoisModal(true)}
                className="py-3.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-2xl text-[11px] font-black uppercase text-emerald-400 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera size={18} /> Fotos / Vistoria
              </button>
            </div>
          </div>

          {/* Part Requests Linked to this OS */}
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                Solicitações de Peças Desta OS ({osRequests.length})
              </h3>
              <button
                onClick={() => setShowPartReqModal(true)}
                className="text-[10px] font-black uppercase text-[#FF2D55] hover:underline cursor-pointer"
              >
                + Nova Solicitação
              </button>
            </div>
            {osRequests.length === 0 ? (
              <p className="text-xs text-zinc-600">Nenhuma peça solicitada ao estoque para esta OS.</p>
            ) : (
              <div className="space-y-2">
                {osRequests.map(req => (
                  <div key={req.id} className="p-3 bg-black/60 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-white">{req.quantity}x {req.partName}</p>
                      <p className="text-[10px] text-zinc-500">
                        Solicitado em {new Date(req.requestedAt).toLocaleString('pt-BR')}
                        {req.refusalReason ? ` • Recusa: ${req.refusalReason}` : ''}
                      </p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                      req.status === 'ATENDIDA'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : req.status === 'RECUSADA'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Diagnostic Notes & Work Logs */}
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <ClipboardCheck size={15} className="text-[#FF2D55]" /> Diário Técnico & Apontamentos
            </h3>
            {selectedOs.diagnosticNotes && (
              <div className="p-3.5 bg-black/60 border border-white/10 rounded-xl text-xs text-zinc-300 whitespace-pre-line">
                {selectedOs.diagnosticNotes}
              </div>
            )}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {(selectedOs.mechanicWorkLogs || []).length === 0 ? (
                <p className="text-xs text-zinc-600">Sem apontamentos registrados ainda.</p>
              ) : (
                (selectedOs.mechanicWorkLogs || []).map(log => (
                  <div key={log.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-[#FF2D55] mr-2">{log.action}</span>
                      <span className="font-bold text-zinc-200">{log.mechanicName}</span>
                      {(log.reason || log.notes) && (
                        <p className="text-zinc-400 mt-0.5">{log.reason || log.notes}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Pausar com Motivo */}
      {showPauseModal && selectedOs && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase text-amber-400">Pausar Serviço • OS #{selectedOs.osNumber}</h3>
              <button onClick={() => setShowPauseModal(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase">Selecione o Motivo</label>
              <div className="space-y-1.5">
                {PAUSE_REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setPauseReason(r)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      pauseReason === r ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-black border-white/10 text-zinc-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={customPauseReason}
                onChange={(e) => setCustomPauseReason(e.target.value)}
                placeholder="Ou digite outro motivo específico..."
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
            <button onClick={handleConfirmPause} className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-black uppercase text-xs cursor-pointer">
              Confirmar Pausa
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Atividade */}
      {showActivityModal && selectedOs && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase text-white">Registrar Atividade Técnica</h3>
              <button onClick={() => setShowActivityModal(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <textarea
              rows={4}
              value={activityNote}
              onChange={(e) => setActivityNote(e.target.value)}
              placeholder="Descreva o que foi diagnosticado, medido ou executado..."
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#FF2D55]"
            />
            <button onClick={handleSaveActivity} className="w-full py-3.5 bg-[#FF2D55] text-white rounded-xl font-black uppercase text-xs cursor-pointer">
              Salvar no Diário da OS
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Pedir Ajuda Técnica */}
      {showHelpModal && selectedOs && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-red-500/30 rounded-3xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase text-red-400 flex items-center gap-2">
                <AlertTriangle size={18} /> Solicitar Apoio Técnico
              </h3>
              <button onClick={() => setShowHelpModal(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <p className="text-xs text-zinc-400">
              A Diretoria e a Gerência receberão um alerta imediato na Central de Notificações para a OS #{selectedOs.osNumber}.
            </p>
            <textarea
              rows={3}
              value={helpMessage}
              onChange={(e) => setHelpMessage(e.target.value)}
              placeholder="Ex: Parafuso espanado no cabeçote / falha intermitente no scanner..."
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500"
            />
            <button onClick={handleSendHelpRequest} className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 cursor-pointer">
              <Send size={15} /> Enviar Alerta à Gerência
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Solicitar Peça ao Estoque */}
      {showPartReqModal && selectedOs && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400">Requisição Vinculada à OS #{selectedOs.osNumber}</span>
                <h3 className="text-base font-black uppercase text-white">Solicitar Peça ao Estoque</h3>
              </div>
              <button onClick={() => setShowPartReqModal(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase">Buscar no Catálogo (Opcional)</label>
              <input
                type="text"
                value={partQuery}
                onChange={(e) => setPartQuery(e.target.value)}
                placeholder="Digite para filtrar peças cadastradas..."
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#FF2D55]"
              />
              {partQuery.trim().length > 0 && (
                <div className="max-h-36 overflow-y-auto bg-black border border-white/10 rounded-xl divide-y divide-white/5">
                  {parts
                    .filter(p => p.name.toLowerCase().includes(partQuery.toLowerCase()) || (p.sku || '').toLowerCase().includes(partQuery.toLowerCase()))
                    .slice(0, 6)
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedCatalogPart(p);
                          setReqPartName(p.name);
                          setPartQuery('');
                        }}
                        className="w-full p-2.5 text-left hover:bg-zinc-900 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="font-mono text-zinc-400">Disp: {p.stock}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase">Descrição da Peça *</label>
              <input
                type="text"
                value={reqPartName}
                onChange={(e) => {
                  setReqPartName(e.target.value);
                  if (selectedCatalogPart && e.target.value !== selectedCatalogPart.name) {
                    setSelectedCatalogPart(null);
                  }
                }}
                placeholder="Ex: Pastilha de Freio Dianteira Bosch"
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={reqQty}
                  onChange={(e) => setReqQty(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase">Prioridade</label>
                <select
                  value={reqUrgency}
                  onChange={(e) => setReqUrgency(e.target.value as 'NORMAL' | 'URGENTE')}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENTE">Urgente (Veículo no Elevador)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase">Observações / Aplicação</label>
              <input
                type="text"
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                placeholder="Ex: Lado direito, modelo com sensor ABS"
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
              />
            </div>

            <button
              onClick={handleSubmitPartRequest}
              className="w-full py-3.5 bg-[#FF2D55] hover:bg-[#e02448] text-white rounded-xl font-black uppercase text-xs tracking-wider cursor-pointer"
            >
              Enviar Solicitação ao Estoque
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Abertura Rápida no Terminal */}
      {showQuickCreateModal && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase text-white">Abertura Rápida de OS</h3>
              <button onClick={() => setShowQuickCreateModal(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={quickPlate}
                onChange={(e) => setQuickPlate(e.target.value.toUpperCase())}
                placeholder="Placa (Ex: ABC1D23) *"
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold text-white outline-none"
              />
              <input
                type="text"
                value={quickModel}
                onChange={(e) => setQuickModel(e.target.value)}
                placeholder="Modelo / Ano *"
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={quickClient}
                  onChange={(e) => setQuickClient(e.target.value)}
                  placeholder="Nome do Cliente"
                  className="bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
                />
                <input
                  type="text"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="Telefone"
                  className="bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
                />
              </div>
              <textarea
                rows={3}
                value={quickProblem}
                onChange={(e) => setQuickProblem(e.target.value)}
                placeholder="Serviço / Problema relatado *"
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
              />
              <button onClick={handleQuickCreateService} className="w-full py-3.5 bg-[#FF2D55] text-white rounded-xl font-black uppercase text-xs cursor-pointer">
                Criar e Iniciar Execução
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Antes e Depois */}
      {showAntesDepoisModal && selectedOs && (
        <AntesEDepoisModal
          isOpen={showAntesDepoisModal}
          onClose={() => setShowAntesDepoisModal(false)}
          os={selectedOs}
          session={session}
          syncData={syncData}
        />
      )}
    </div>
  );
};

export default MechanicTerminal;
