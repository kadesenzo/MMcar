import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Trash2, X, Eye, Printer, ImageIcon, Car, Camera,
  Clock, Wrench, CheckCircle2, AlertTriangle, Plus, ShieldCheck,
  FileText, History, MapPin, Users, Edit3, Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ServiceOrder, UserSession, OSStatus, PaymentStatus,
  Employee, WorkshopBox, OSItem
} from '../types';
import html2canvas from 'html2canvas';
import Invoice from '../components/Invoice';
import AntesEDepoisModal from '../components/AntesEDepoisModal';
import {
  readWorkshopData, writeWorkshopData, isAdminRole,
  createOSTimelineEvent, appendAuditLog, loadOrInitBoxes,
  isOrderStalled, getVehicleStalledHours
} from '../src/utils/workshopHelpers';

const ALL_STATUSES: OSStatus[] = [
  OSStatus.AGUARDANDO_DIAGNOSTICO,
  OSStatus.EM_DIAGNOSTICO,
  OSStatus.ORCAMENTO_ENVIADO,
  OSStatus.AGUARDANDO_APROVACAO,
  OSStatus.EM_SERVICO,
  OSStatus.FINALIZACAO,
  OSStatus.PRONTO,
  OSStatus.ENTREGUE,
  OSStatus.CANCELADO
];

const ServiceOrders: React.FC<{ role?: string; session?: UserSession; syncData?: (key: string, data: any) => Promise<void> }> = ({ role = 'Dono', session, syncData }) => {
  const navigate = useNavigate();
  const tenant = session?.username || 'rafael';
  const activeUser = session?.activeUser || session?.username || 'Operador';

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [boxes, setBoxes] = useState<WorkshopBox[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVAS' | 'OFICINA' | 'QUALIDADE' | 'ENTREGUES'>('ALL');

  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null); // Invoice preview modal
  const [detailsOrder, setDetailsOrder] = useState<ServiceOrder | null>(null);   // Full OS details & timeline modal
  const [antesDepoisOs, setAntesDepoisOs] = useState<ServiceOrder | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Editable states inside Details Modal
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editObs, setEditObs] = useState('');
  const [editBox, setEditBox] = useState('');
  const [editDiscount, setEditDiscount] = useState('0');
  const [editLabor, setEditLabor] = useState('0');
  const [editStatus, setEditStatus] = useState<OSStatus>(OSStatus.EM_SERVICO);
  const [editMechanics, setEditMechanics] = useState<string[]>([]);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemType, setNewItemType] = useState<'SERVICE' | 'PART'>('SERVICE');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [detailsTab, setDetailsTab] = useState<'GERAL' | 'ITENS' | 'TIMELINE'>('GERAL');

  const loadAll = () => {
    const loadedOrders = readWorkshopData<ServiceOrder[]>(tenant, 'orders', []);
    setOrders(loadedOrders);
    setEmployees(readWorkshopData<Employee[]>(tenant, 'employees', []));
    setBoxes(loadOrInitBoxes(tenant, loadedOrders));
  };

  useEffect(() => {
    loadAll();
    window.addEventListener('kaen_storage_updated', loadAll);
    return () => window.removeEventListener('kaen_storage_updated', loadAll);
  }, [tenant]);

  const openDetails = (os: ServiceOrder) => {
    setDetailsOrder(os);
    setEditDiagnosis(os.diagnosticNotes || os.problem || '');
    setEditObs(os.observations || '');
    setEditBox(os.boxNumber || '');
    setEditDiscount((os.discount || 0).toString());
    setEditLabor((os.laborValue || 0).toString());
    setEditStatus(os.status || OSStatus.EM_SERVICO);
    setEditMechanics(
      os.assignedMechanics && os.assignedMechanics.length > 0
        ? os.assignedMechanics
        : os.mechanicResponsible
          ? [os.mechanicResponsible]
          : []
    );
    setDetailsTab('GERAL');
  };

  const persistOrders = async (updated: ServiceOrder[]) => {
    setOrders(updated);
    writeWorkshopData(tenant, 'orders', updated);
    if (syncData) {
      await syncData('orders', updated);
    }
  };

  const handleSaveDetails = async () => {
    if (!detailsOrder) return;
    const prev = detailsOrder;
    const newLabor = parseFloat(editLabor) || 0;
    const newDiscount = parseFloat(editDiscount) || 0;
    const itemsSum = (prev.items || []).reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const newTotal = Math.max(0, itemsSum + newLabor - newDiscount);

    const newEvents = [...(prev.timeline || [])];

    if (prev.status !== editStatus) {
      newEvents.unshift(
        createOSTimelineEvent(
          'STATUS_ALTERADO',
          `Status alterado de "${prev.status}" para "${editStatus}"`,
          activeUser,
          role,
          { field: 'status', previousValue: prev.status, newValue: editStatus }
        )
      );
    }
    if ((prev.boxNumber || '') !== editBox) {
      newEvents.unshift(
        createOSTimelineEvent(
          'BOX_ATUALIZADO',
          `Box alterado para ${editBox || 'Sem box'}`,
          activeUser,
          role
        )
      );
    }
    if (JSON.stringify(prev.assignedMechanics || []) !== JSON.stringify(editMechanics)) {
      newEvents.unshift(
        createOSTimelineEvent(
          'EQUIPE_ATUALIZADA',
          `Mecânicos vinculados: ${editMechanics.join(', ') || 'Nenhum'}`,
          activeUser,
          role
        )
      );
    }
    if ((prev.diagnosticNotes || prev.problem || '') !== editDiagnosis) {
      newEvents.unshift(
        createOSTimelineEvent(
          'DIAGNOSTICO_ATUALIZADO',
          'Diagnóstico técnico atualizado na OS',
          activeUser,
          role
        )
      );
    }

    const updatedOrder: ServiceOrder = {
      ...prev,
      status: editStatus,
      boxNumber: editBox || undefined,
      diagnosticNotes: editDiagnosis,
      problem: editDiagnosis || prev.problem,
      observations: editObs,
      assignedMechanics: editMechanics,
      mechanicResponsible: editMechanics[0] || prev.mechanicResponsible,
      laborValue: newLabor,
      discount: newDiscount,
      totalValue: newTotal,
      timeline: newEvents,
      updatedAt: new Date().toISOString()
    };

    const updated = orders.map(o => (o.id === prev.id ? updatedOrder : o));
    await persistOrders(updated);
    appendAuditLog(tenant, activeUser, 'EDITOU_OS', `OS #${prev.osNumber}`, `Status: ${editStatus} | Total: R$ ${newTotal.toFixed(2)}`);
    setDetailsOrder(updatedOrder);
  };

  const handleAddInlineItem = async () => {
    if (!detailsOrder || !newItemDesc.trim()) return;
    const qty = parseFloat(newItemQty) || 1;
    const price = parseFloat(newItemPrice) || 0;
    const newItem: OSItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: newItemDesc.toUpperCase(),
      quantity: qty,
      unitPrice: price,
      type: newItemType
    };
    const nextItems = [...(detailsOrder.items || []), newItem];
    const itemsSum = nextItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const nextTotal = Math.max(0, itemsSum + (detailsOrder.laborValue || 0) - (detailsOrder.discount || 0));
    const event = createOSTimelineEvent(
      'ITEM_ADICIONADO',
      `${newItemType === 'PART' ? 'Peça' : 'Serviço'} adicionado: ${newItem.description} (${qty}x R$ ${price.toFixed(2)})`,
      activeUser,
      role
    );
    const updatedOrder: ServiceOrder = {
      ...detailsOrder,
      items: nextItems,
      totalValue: nextTotal,
      timeline: [event, ...(detailsOrder.timeline || [])],
      updatedAt: new Date().toISOString()
    };
    const updated = orders.map(o => (o.id === detailsOrder.id ? updatedOrder : o));
    await persistOrders(updated);
    setDetailsOrder(updatedOrder);
    setNewItemDesc('');
    setNewItemQty('1');
    setNewItemPrice('');
  };

  const handleRemoveInlineItem = async (itemId: string) => {
    if (!detailsOrder) return;
    const removed = (detailsOrder.items || []).find(i => i.id === itemId);
    const nextItems = (detailsOrder.items || []).filter(i => i.id !== itemId);
    const itemsSum = nextItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const nextTotal = Math.max(0, itemsSum + (detailsOrder.laborValue || 0) - (detailsOrder.discount || 0));
    const event = createOSTimelineEvent(
      'ITEM_REMOVIDO',
      `Item removido: ${removed?.description || itemId}`,
      activeUser,
      role
    );
    const updatedOrder: ServiceOrder = {
      ...detailsOrder,
      items: nextItems,
      totalValue: nextTotal,
      timeline: [event, ...(detailsOrder.timeline || [])],
      updatedAt: new Date().toISOString()
    };
    const updated = orders.map(o => (o.id === detailsOrder.id ? updatedOrder : o));
    await persistOrders(updated);
    setDetailsOrder(updatedOrder);
  };

  const handleDelete = async (id: string) => {
    if (!isAdminRole(role)) return;
    const target = orders.find(o => o.id === id);
    if (!confirm(`CONFIRMA EXCLUSÃO DA OS #${target?.osNumber || ''}?`)) return;
    const updated = orders.filter(o => o.id !== id);
    await persistOrders(updated);
    appendAuditLog(tenant, activeUser, 'EXCLUIU_OS', `OS #${target?.osNumber || id}`, target?.vehiclePlate);
  };

  const downloadImage = async () => {
    const target = document.getElementById('render-target-hidden');
    if (!target || !selectedOrder || !invoiceRef.current) return;

    const clone = invoiceRef.current.cloneNode(true) as HTMLDivElement;
    clone.style.width = '794px';
    clone.style.height = 'auto';
    clone.style.position = 'static';

    target.innerHTML = '';
    target.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2.5,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        width: 794,
        height: clone.offsetHeight
      });
      const link = document.createElement('a');
      link.download = `MM_CAR_OS_${selectedOrder.osNumber}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error(err);
      alert('Houve um erro ao gerar a imagem da ordem de serviço.');
    } finally {
      target.innerHTML = '';
    }
  };

  const mechanicPool = useMemo(() => {
    const names = new Set<string>(['Eduardo', 'Thiago']);
    employees.filter(e => e.status === 'Ativo' && (e.role.includes('Mec') || e.role.includes('Téc'))).forEach(e => names.add(e.name));
    return Array.from(names);
  }, [employees]);

  const filtered = orders
    .filter(o => {
      const q = searchTerm.toLowerCase();
      const matches =
        (o.clientName || '').toLowerCase().includes(q) ||
        (o.vehiclePlate || '').toLowerCase().includes(q) ||
        (o.osNumber || '').toLowerCase().includes(q) ||
        (o.vehicleModel || '').toLowerCase().includes(q);
      if (!matches) return false;

      if (statusFilter === 'ATIVAS') {
        return ![OSStatus.ENTREGUE, OSStatus.FINALIZADO, OSStatus.CANCELADO].includes(o.status);
      }
      if (statusFilter === 'OFICINA') {
        return [OSStatus.AGUARDANDO_DIAGNOSTICO, OSStatus.EM_DIAGNOSTICO, OSStatus.EM_SERVICO, OSStatus.EM_ANDAMENTO].includes(o.status);
      }
      if (statusFilter === 'QUALIDADE') {
        return [OSStatus.FINALIZACAO, OSStatus.PRONTO].includes(o.status);
      }
      if (statusFilter === 'ENTREGUES') {
        return [OSStatus.ENTREGUE, OSStatus.FINALIZADO].includes(o.status);
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusBadgeStyle = (status: OSStatus) => {
    switch (status) {
      case OSStatus.EM_SERVICO:
      case OSStatus.EM_ANDAMENTO:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      case OSStatus.FINALIZACAO:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
      case OSStatus.PRONTO:
      case OSStatus.ENTREGUE:
      case OSStatus.FINALIZADO:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      case OSStatus.ORCAMENTO_ENVIADO:
      case OSStatus.AGUARDANDO_APROVACAO:
      case OSStatus.ORCAMENTO:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
      case OSStatus.CANCELADO:
        return 'bg-red-500/10 text-red-400 border-red-500/25';
      default:
        return 'bg-zinc-800/60 text-zinc-300 border-zinc-700/40';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-8 p-4 md:p-8 pb-32 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF2D55] block mb-1">
            Módulo 03 • Ordens de Serviço & Timeline
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter">
            Ordens de <span className="text-[#FF2D55]">Serviço</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Controle completo de diagnóstico, múltiplos mecânicos, peças vinculadas, descontos e histórico de alterações.
          </p>
        </div>

        <button
          onClick={() => navigate('/new-order')}
          className="px-6 py-3.5 bg-[#FF2D55] hover:bg-[#e02448] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-[#FF2D55]/20"
        >
          <Plus size={16} /> Abrir Nova OS
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="flex-1 bg-zinc-950 border border-white/10 rounded-2xl p-1.5 flex items-center">
          <Search className="ml-4 text-zinc-500" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por placa, modelo, cliente ou nº da OS..."
            className="w-full bg-transparent border-none py-3 px-4 text-white font-semibold text-xs outline-none placeholder-zinc-600"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-white/10 rounded-2xl overflow-x-auto">
          {[
            { id: 'ALL', label: `Todas (${orders.length})` },
            { id: 'ATIVAS', label: 'Em Aberto' },
            { id: 'OFICINA', label: 'Na Oficina' },
            { id: 'QUALIDADE', label: 'Qualidade / Pronto' },
            { id: 'ENTREGUES', label: 'Entregues' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#FF2D55] text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* OS Cards Grid */}
      {filtered.length === 0 ? (
        <div className="p-16 text-center bg-zinc-950/60 border border-dashed border-white/10 rounded-3xl space-y-3">
          <FileText size={36} className="mx-auto text-zinc-700" />
          <p className="text-sm font-bold text-zinc-400">Nenhuma Ordem de Serviço encontrada.</p>
          <p className="text-xs text-zinc-600">Altere os filtros ou abra uma nova OS para iniciar o atendimento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
          {filtered.map(os => {
            const stalled = isOrderStalled(os);
            const stalledHours = getVehicleStalledHours(os);
            const mechList = os.assignedMechanics && os.assignedMechanics.length > 0
              ? os.assignedMechanics
              : os.mechanicResponsible ? [os.mechanicResponsible] : [];

            return (
              <div
                key={os.id}
                className="bg-zinc-950/90 border border-white/10 rounded-[2rem] p-6 hover:border-[#FF2D55]/50 transition-all group flex flex-col justify-between gap-5 shadow-xl"
              >
                <div className="space-y-4">
                  {/* Top row */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-black text-zinc-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        OS #{os.osNumber}
                      </span>
                      {os.boxNumber && (
                        <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                          {os.boxNumber}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(os.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {/* Vehicle */}
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-white/5 rounded-2xl text-zinc-400 group-hover:text-[#FF2D55] transition-colors shrink-0">
                      <Car size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-black text-white uppercase tracking-tight leading-none font-mono">
                        {os.vehiclePlate}
                      </p>
                      <p className="text-[11px] font-bold text-zinc-400 uppercase truncate mt-1">
                        {os.vehicleModel}
                        {os.vehicleKm ? ` • ${Number(os.vehicleKm).toLocaleString('pt-BR')} KM` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Status + Alerts */}
                  <div className="space-y-2">
                    <div className={`py-2.5 px-4 rounded-xl text-center text-[10px] font-black uppercase tracking-widest border ${getStatusBadgeStyle(os.status)}`}>
                      {os.status || OSStatus.EM_SERVICO}
                    </div>

                    {(stalled || os.isRework) && (
                      <div className="flex flex-wrap gap-1.5">
                        {stalled && (
                          <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Clock size={11} /> Parado há {stalledHours}h
                          </span>
                        )}
                        {os.isRework && (
                          <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                            <AlertTriangle size={11} /> Retrabalho ({os.reworkCount || 1}x)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Client & Mechanics */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="min-w-0">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Cliente</span>
                      <p className="text-xs font-bold text-zinc-200 uppercase truncate">{os.clientName}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Mecânicos</span>
                      <p className="text-xs font-bold text-zinc-300 truncate">
                        {mechList.length > 0 ? mechList.join(', ') : 'A definir'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer & Actions */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-black text-zinc-500 uppercase">Valor Total</p>
                    <p className="text-base font-black text-white font-mono tabular-nums">
                      R$ {(os.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openDetails(os)}
                      className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Abrir Prontuário Completo e Timeline da OS"
                    >
                      <Edit3 size={14} className="text-[#FF2D55]" /> Ficha
                    </button>
                    <button
                      onClick={() => setAntesDepoisOs(os)}
                      className="p-2.5 bg-white/5 text-zinc-400 hover:text-emerald-400 rounded-xl border border-white/10 transition-all cursor-pointer"
                      title="Vistoria e Fotos Antes & Depois"
                    >
                      <Camera size={16} />
                    </button>
                    <button
                      onClick={() => setSelectedOrder(os)}
                      className="p-2.5 bg-white/5 text-[#FF2D55] hover:bg-[#FF2D55] hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer"
                      title="Comprovante de OS / Impressão"
                    >
                      <Eye size={16} />
                    </button>
                    {isAdminRole(role) && (
                      <button
                        onClick={() => handleDelete(os.id)}
                        className="p-2.5 bg-white/5 text-zinc-500 hover:text-red-400 rounded-xl border border-white/10 transition-all cursor-pointer"
                        title="Excluir OS"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL OS DETAILS, EDITING & TIMELINE MODAL */}
      {detailsOrder && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-white/10 rounded-[2rem] w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl my-auto">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-black text-[#FF2D55] bg-[#FF2D55]/10 px-2.5 py-1 rounded-lg border border-[#FF2D55]/20">
                    OS #{detailsOrder.osNumber}
                  </span>
                  <span className="text-sm font-mono font-black text-white">{detailsOrder.vehiclePlate}</span>
                  <span className="text-xs text-zinc-400 font-bold uppercase">{detailsOrder.vehicleModel}</span>
                </div>
                <h2 className="text-xl font-black text-white uppercase mt-2">
                  {detailsOrder.clientName} {detailsOrder.clientPhone ? `• ${detailsOrder.clientPhone}` : ''}
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Abertura: {new Date(detailsOrder.createdAt).toLocaleString('pt-BR')}
                  {detailsOrder.receptionistName ? ` • Atendente: ${detailsOrder.receptionistName}` : ''}
                  {detailsOrder.vehicleKm ? ` • KM Entrada: ${Number(detailsOrder.vehicleKm).toLocaleString('pt-BR')}` : ''}
                  {detailsOrder.kmExit ? ` • KM Saída: ${Number(detailsOrder.kmExit).toLocaleString('pt-BR')}` : ''}
                </p>
              </div>
              <button
                onClick={() => setDetailsOrder(null)}
                className="self-end sm:self-center p-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl border border-white/10 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Sub-tabs */}
            <div className="flex items-center gap-2 bg-black/50 p-1.5 rounded-2xl border border-white/10">
              {[
                { id: 'GERAL', label: 'Diagnóstico, Box & Equipe', icon: Wrench },
                { id: 'ITENS', label: `Serviços & Peças (${detailsOrder.items?.length || 0})`, icon: FileText },
                { id: 'TIMELINE', label: `Timeline (${detailsOrder.timeline?.length || 0})`, icon: History }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setDetailsTab(t.id as any)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    detailsTab === t.id ? 'bg-[#FF2D55] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>

            {detailsTab === 'GERAL' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status Atual da OS</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as OSStatus)}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
                    >
                      {ALL_STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin size={12} className="text-[#FF2D55]" /> Box / Elevador Alocado
                    </label>
                    <select
                      value={editBox}
                      onChange={(e) => setEditBox(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
                    >
                      <option value="">Sem Box Definido (Pátio)</option>
                      {boxes.map(b => (
                        <option key={b.id} value={b.code}>
                          {b.code} — {b.name} ({b.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Multiple Mechanics assignment */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={12} className="text-[#FF2D55]" /> Mecânicos Envolvidos (Múltipla Seleção)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {mechanicPool.map(name => {
                      const selected = editMechanics.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() =>
                            setEditMechanics(prev =>
                              prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
                            )
                          }
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            selected
                              ? 'bg-[#FF2D55] text-white border-[#FF2D55]'
                              : 'bg-black text-zinc-400 border-white/10 hover:border-white/30'
                          }`}
                        >
                          {selected ? '✓ ' : ''}{name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Diagnosis & Observations */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Diagnóstico Técnico / Problema</label>
                  <textarea
                    rows={3}
                    value={editDiagnosis}
                    onChange={(e) => setEditDiagnosis(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-[#FF2D55]"
                    placeholder="Descreva os problemas diagnosticados..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Observações Gerais & Recomendações</label>
                  <textarea
                    rows={2}
                    value={editObs}
                    onChange={(e) => setEditObs(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-[#FF2D55]"
                    placeholder="Observações para recepção, garantia ou cliente..."
                  />
                </div>

                {/* Labor & Discount */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-white/10">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase">Mão de Obra Geral (R$)</label>
                    <input
                      type="number"
                      value={editLabor}
                      onChange={(e) => setEditLabor(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-white outline-none focus:border-[#FF2D55]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase">Desconto Concedido (R$)</label>
                    <input
                      type="number"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-emerald-400 outline-none focus:border-[#FF2D55]"
                    />
                  </div>
                  <div className="flex flex-col justify-center items-end">
                    <span className="text-[10px] font-black text-zinc-500 uppercase">Total Calculado</span>
                    <span className="text-xl font-black text-[#FF2D55] font-mono tabular-nums">
                      R$ {Math.max(
                        0,
                        (detailsOrder.items || []).reduce((acc, i) => acc + i.quantity * i.unitPrice, 0) +
                          (parseFloat(editLabor) || 0) -
                          (parseFloat(editDiscount) || 0)
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Approvals / Quality / Warranty summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-black/50 border border-white/10 rounded-xl">
                    <span className="text-[9px] font-black text-zinc-500 uppercase block">Aprovação Orçamento</span>
                    <span className={`font-bold ${detailsOrder.budgetApproved ? 'text-emerald-400' : detailsOrder.budgetRejected ? 'text-red-400' : 'text-amber-400'}`}>
                      {detailsOrder.budgetApproved ? 'Aprovado' : detailsOrder.budgetRejected ? 'Recusado' : 'Pendente'}
                    </span>
                  </div>
                  <div className="p-3 bg-black/50 border border-white/10 rounded-xl">
                    <span className="text-[9px] font-black text-zinc-500 uppercase block">Inspeção de Qualidade</span>
                    <span className={`font-bold ${detailsOrder.qualityInspection?.passed ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {detailsOrder.qualityInspection
                        ? detailsOrder.qualityInspection.passed ? `Aprovado (${detailsOrder.qualityInspection.inspectedBy})` : 'Reprovado / Retrabalho'
                        : 'Aguardando inspeção'}
                    </span>
                  </div>
                  <div className="p-3 bg-black/50 border border-white/10 rounded-xl">
                    <span className="text-[9px] font-black text-zinc-500 uppercase block">Garantia Técnica</span>
                    <span className="font-bold text-zinc-200 flex items-center gap-1">
                      <ShieldCheck size={13} className="text-emerald-400" />
                      {detailsOrder.warrantyDays || 90} dias
                      {detailsOrder.warrantyExpiresAt ? ` (até ${new Date(detailsOrder.warrantyExpiresAt).toLocaleDateString('pt-BR')})` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setSelectedOrder(detailsOrder);
                      setDetailsOrder(null);
                    }}
                    className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider border border-white/10 cursor-pointer"
                  >
                    Gerar Comprovante
                  </button>
                  <button
                    onClick={handleSaveDetails}
                    className="px-6 py-3 bg-[#FF2D55] hover:bg-[#e02448] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                  >
                    <Save size={15} /> Salvar Alterações na OS
                  </button>
                </div>
              </div>
            )}

            {detailsTab === 'ITENS' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-zinc-900/60 p-4 rounded-2xl border border-white/10">
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as 'SERVICE' | 'PART')}
                    className="sm:col-span-2 bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none"
                  >
                    <option value="SERVICE">Serviço</option>
                    <option value="PART">Peça</option>
                  </select>
                  <input
                    type="text"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    placeholder="Descrição da peça ou serviço..."
                    className="sm:col-span-5 bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none"
                  />
                  <input
                    type="number"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    placeholder="Qtd"
                    className="sm:col-span-2 bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white outline-none"
                  />
                  <input
                    type="number"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="Valor Unit R$"
                    className="sm:col-span-2 bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white outline-none"
                  />
                  <button
                    onClick={handleAddInlineItem}
                    className="sm:col-span-1 bg-[#FF2D55] hover:bg-[#e02448] text-white rounded-xl flex items-center justify-center p-2.5 cursor-pointer"
                    title="Adicionar Item"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {(detailsOrder.items || []).length === 0 ? (
                    <p className="text-center text-xs text-zinc-500 py-8">Nenhum item ou peça vinculado a esta OS.</p>
                  ) : (
                    (detailsOrder.items || []).map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-3 p-3.5 bg-black/50 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${item.type === 'PART' ? 'bg-amber-500/15 text-amber-400' : 'bg-sky-500/15 text-sky-400'}`}>
                            {item.type === 'PART' ? 'Peça' : 'Serviço'}
                          </span>
                          <span className="text-xs font-bold text-white truncate">{item.description}</span>
                          <span className="text-[11px] font-mono text-zinc-400">({item.quantity}x R$ {item.unitPrice.toFixed(2)})</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono font-black text-white">
                            R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            onClick={() => handleRemoveInlineItem(item.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {detailsTab === 'TIMELINE' && (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {(detailsOrder.timeline || []).length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <History size={28} className="mx-auto text-zinc-700" />
                    <p className="text-xs text-zinc-500">Nenhuma movimentação registrada na timeline desta OS ainda.</p>
                    <p className="text-[11px] text-zinc-600">As próximas edições, aprovações e apontamentos de mecânico aparecerão aqui com usuário, data e hora.</p>
                  </div>
                ) : (
                  (detailsOrder.timeline || []).map(ev => (
                    <div key={ev.id} className="p-4 bg-black/60 border border-white/10 rounded-2xl flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FF2D55]/15 text-[#FF2D55] border border-[#FF2D55]/25">
                            {ev.action}
                          </span>
                          <span className="text-xs font-bold text-zinc-200">{ev.user}</span>
                          {ev.role && <span className="text-[10px] text-zinc-500">({ev.role})</span>}
                        </div>
                        <p className="text-xs text-zinc-300">{ev.description}</p>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {new Date(ev.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INVOICE / PRINT PREVIEW MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-3xl overflow-y-auto no-scrollbar animate-in fade-in duration-300">
          <div className="w-full max-w-[850px] flex flex-col items-center gap-10 my-16 px-4">
            <button
              onClick={() => setSelectedOrder(null)}
              className="fixed top-6 right-6 text-white bg-white/10 p-4 rounded-full hover:bg-[#FF2D55] transition-all z-[210] border border-white/10 active:scale-90 cursor-pointer"
            >
              <X size={28} />
            </button>

            <div className="invoice-preview-wrapper">
              <div className="invoice-container-scaled">
                <div ref={invoiceRef}>
                  <Invoice os={selectedOrder} />
                </div>
              </div>
            </div>

            <div className="w-full max-w-[500px] flex flex-col gap-3 px-4 pb-16">
              <button
                onClick={() => setAntesDepoisOs(selectedOrder)}
                className="w-full bg-[#FF2D55] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl cursor-pointer"
              >
                <Camera size={20} /> Vistoria Fotográfica (Antes & Depois)
              </button>
              <button
                onClick={downloadImage}
                className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl cursor-pointer"
              >
                <ImageIcon size={20} /> Salvar Imagem (WhatsApp)
              </button>
              <button
                onClick={() => window.print()}
                className="bg-zinc-900 py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-800 border border-white/10 text-white cursor-pointer"
              >
                <Printer size={20} /> Imprimir em A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Antes e Depois */}
      {antesDepoisOs && (
        <AntesEDepoisModal
          isOpen={!!antesDepoisOs}
          onClose={() => setAntesDepoisOs(null)}
          os={antesDepoisOs}
          session={session}
          syncData={syncData}
        />
      )}
    </div>
  );
};

export default ServiceOrders;
