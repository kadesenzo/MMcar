import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Search, Plus, AlertCircle, Trash2, X, ArrowUp, ArrowDown,
  Check, RefreshCw, Box, TrendingUp, AlertTriangle, ClipboardList,
  History, CheckCircle2, XCircle, MapPin
} from 'lucide-react';
import {
  Part, UserSession, PartRequest, StockMovement, ServiceOrder, OSItem
} from '../types';
import {
  readWorkshopData, writeWorkshopData, createOSTimelineEvent,
  pushSystemNotification, appendAuditLog
} from '../src/utils/workshopHelpers';

const Inventory: React.FC<{ session?: UserSession; syncData?: (key: string, data: any) => Promise<void> }> = ({ session, syncData }) => {
  const tenant = session?.username || 'rafael';
  const activeUser = session?.activeUser || session?.username || 'Estoque';

  const [activeTab, setActiveTab] = useState<'CATALOGO' | 'SOLICITACOES' | 'MOVIMENTACOES' | 'MINIMO'>('CATALOGO');
  const [parts, setParts] = useState<Part[]>([]);
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<string, number | string>>({});
  const [fulfillModalReq, setFulfillModalReq] = useState<PartRequest | null>(null);
  const [fulfillCatalogPartId, setFulfillCatalogPartId] = useState<string>('');
  const [fulfillUnitCost, setFulfillUnitCost] = useState<string>('0');
  const [fulfillUnitSale, setFulfillUnitSale] = useState<string>('0');
  const [refuseModalReq, setRefuseModalReq] = useState<PartRequest | null>(null);
  const [refuseReason, setRefuseReason] = useState('');
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const [newPart, setNewPart] = useState({
    name: '',
    sku: '',
    brand: '',
    supplier: '',
    category: 'Geral',
    location: '',
    stock: 0,
    minStock: 2,
    salePrice: 0,
    costPrice: 0
  });

  const loadData = () => {
    setParts(readWorkshopData<Part[]>(tenant, 'parts', []));
    setRequests(readWorkshopData<PartRequest[]>(tenant, 'part_requests', []));
    setMovements(readWorkshopData<StockMovement[]>(tenant, 'stock_movements', []));
    setOrders(readWorkshopData<ServiceOrder[]>(tenant, 'orders', []));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [tenant]);

  const showNotice = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(null), 4000);
  };

  const saveParts = async (updated: Part[]) => {
    setParts(updated);
    writeWorkshopData(tenant, 'parts', updated);
    if (syncData) await syncData('parts', updated);
  };

  const saveMovements = async (updated: StockMovement[]) => {
    setMovements(updated);
    writeWorkshopData(tenant, 'stock_movements', updated);
    if (syncData) await syncData('stock_movements', updated);
  };

  const saveRequests = async (updated: PartRequest[]) => {
    setRequests(updated);
    writeWorkshopData(tenant, 'part_requests', updated);
    if (syncData) await syncData('part_requests', updated);
  };

  const handleSavePart = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPart.name.trim()) return;
    const part: Part = {
      ...newPart,
      name: newPart.name.trim().toUpperCase(),
      sku: newPart.sku.trim().toUpperCase(),
      id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    };
    const updated = [part, ...parts];
    await saveParts(updated);

    if (part.stock > 0) {
      const mov: StockMovement = {
        id: `mov-${Date.now()}`,
        type: 'INBOUND',
        partId: part.id,
        partName: part.name,
        sku: part.sku,
        quantity: part.stock,
        unitCost: part.costPrice,
        unitSale: part.salePrice,
        supplierName: part.supplier || undefined,
        reason: 'Cadastro inicial de saldo no estoque',
        userName: activeUser,
        date: new Date().toISOString()
      };
      await saveMovements([mov, ...movements]);
    }

    appendAuditLog(tenant, activeUser, 'CADASTROU_PECA', part.name, `Qtd: ${part.stock} | Custo: R$ ${part.costPrice.toFixed(2)}`);
    setShowModal(false);
    setNewPart({ name: '', sku: '', brand: '', supplier: '', category: 'Geral', location: '', stock: 0, minStock: 2, salePrice: 0, costPrice: 0 });
    showNotice(`Peça "${part.name}" cadastrada no catálogo.`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover permanentemente este item do catálogo?')) return;
    const target = parts.find(p => p.id === id);
    const updated = parts.filter(p => p.id !== id);
    await saveParts(updated);
    appendAuditLog(tenant, activeUser, 'REMOVEU_PECA', target?.name || id);
  };

  const getNumericAdjustment = (id: string) => {
    const raw = adjustments[id];
    if (raw === undefined || raw === '' || raw === '-') return 0;
    const parsed = parseInt(String(raw), 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleQuickAdjust = async (part: Part) => {
    const amount = getNumericAdjustment(part.id);
    if (amount === 0) return;

    const newStock = (Number(part.stock) || 0) + amount;
    if (newStock < 0) {
      alert('ERRO: O estoque não pode ficar negativo.');
      return;
    }

    const updated = parts.map(p => (p.id === part.id ? { ...p, stock: newStock } : p));
    await saveParts(updated);

    const mov: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type: amount > 0 ? 'INBOUND' : 'OUTBOUND',
      partId: part.id,
      partName: part.name,
      sku: part.sku,
      quantity: Math.abs(amount),
      unitCost: part.costPrice || 0,
      unitSale: part.salePrice || 0,
      reason: amount > 0 ? 'Entrada manual / reposição no estoque' : 'Saída manual / ajuste de balanço',
      userName: activeUser,
      date: new Date().toISOString()
    };
    await saveMovements([mov, ...movements]);

    const newAdjustments = { ...adjustments };
    delete newAdjustments[part.id];
    setAdjustments(newAdjustments);
    showNotice(`Saldo atualizado: ${part.name} (${newStock} unid.).`);
  };

  const openFulfillModal = (req: PartRequest) => {
    setFulfillModalReq(req);
    const matched = parts.find(
      p => (req.partId && p.id === req.partId) || p.name.toLowerCase() === req.partName.toLowerCase()
    );
    if (matched) {
      setFulfillCatalogPartId(matched.id);
      setFulfillUnitCost(String(matched.costPrice || 0));
      setFulfillUnitSale(String(matched.salePrice || 0));
    } else {
      setFulfillCatalogPartId('');
      setFulfillUnitCost('0');
      setFulfillUnitSale('0');
    }
  };

  const handleConfirmFulfill = async () => {
    if (!fulfillModalReq) return;
    const req = fulfillModalReq;
    const unitCost = parseFloat(fulfillUnitCost) || 0;
    const unitSale = parseFloat(fulfillUnitSale) || 0;

    let updatedParts = [...parts];
    let matchedPart = parts.find(p => p.id === fulfillCatalogPartId);
    if (matchedPart) {
      if (matchedPart.stock < req.quantity) {
        alert(`Saldo insuficiente em estoque (${matchedPart.stock} disponíveis para ${req.quantity} solicitados).`);
        return;
      }
      updatedParts = updatedParts.map(p =>
        p.id === matchedPart!.id ? { ...p, stock: Math.max(0, p.stock - req.quantity) } : p
      );
      await saveParts(updatedParts);
    }

    // 1. Record stock movement linked to OS
    const mov: StockMovement = {
      id: `mov-${Date.now()}`,
      type: 'OUTBOUND',
      partId: matchedPart?.id || req.partId || 'avulsa',
      partName: matchedPart?.name || req.partName,
      sku: matchedPart?.sku || req.sku,
      quantity: req.quantity,
      unitCost,
      unitSale,
      osId: req.osId,
      osNumber: req.osNumber,
      reason: `Saída p/ mecânico ${req.mechanicName} (OS #${req.osNumber} • ${req.vehiclePlate})`,
      userName: activeUser,
      date: new Date().toISOString()
    };
    await saveMovements([mov, ...movements]);

    // 2. Append item to OS and recalculate totalValue
    const osItem: OSItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: matchedPart?.name || req.partName,
      quantity: req.quantity,
      unitPrice: unitSale,
      costPrice: unitCost,
      partId: matchedPart?.id || req.partId,
      type: 'PART'
    };

    const nextOrders = orders.map(os => {
      if (os.id !== req.osId) return os;
      const nextItems = [...(os.items || []), osItem];
      const itemsSum = nextItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
      const nextTotal = Math.max(0, itemsSum + (os.laborValue || 0) - (os.discount || 0));
      return {
        ...os,
        items: nextItems,
        totalValue: nextTotal,
        timeline: [
          createOSTimelineEvent(
            'PECA_VINCULADA_ESTOQUE',
            `${activeUser} atendeu solicitação: ${req.quantity}x ${osItem.description} (R$ ${unitSale.toFixed(2)}/un)`,
            activeUser,
            session?.role
          ),
          ...(os.timeline || [])
        ],
        updatedAt: new Date().toISOString()
      };
    });
    setOrders(nextOrders);
    writeWorkshopData(tenant, 'orders', nextOrders);
    if (syncData) await syncData('orders', nextOrders);

    // 3. Mark request as ATENDIDA
    const nextRequests = requests.map(r =>
      r.id === req.id
        ? {
            ...r,
            status: 'ATENDIDA' as const,
            fulfilledBy: activeUser,
            fulfilledAt: new Date().toISOString()
          }
        : r
    );
    await saveRequests(nextRequests);

    pushSystemNotification(tenant, {
      title: `Peça Liberada • OS #${req.osNumber}`,
      message: `${req.quantity}x ${osItem.description} separada por ${activeUser} para ${req.mechanicName}.`,
      category: 'ESTOQUE',
      severity: 'INFO',
      targetRoles: ['Mecânico', 'Funcionário', 'Dono', 'Gerente'],
      relatedPath: '/terminal',
      relatedId: req.osId
    });
    appendAuditLog(tenant, activeUser, 'ATENDEU_SOLICITACAO_PECA', `OS #${req.osNumber}`, `${req.quantity}x ${osItem.description}`);

    setFulfillModalReq(null);
    showNotice(`Peça "${osItem.description}" separada e vinculada à OS #${req.osNumber}!`);
  };

  const handleConfirmRefuse = async () => {
    if (!refuseModalReq) return;
    const reason = refuseReason.trim() || 'Item indisponível no estoque no momento';
    const nextRequests = requests.map(r =>
      r.id === refuseModalReq.id
        ? {
            ...r,
            status: 'RECUSADA' as const,
            fulfilledBy: activeUser,
            fulfilledAt: new Date().toISOString(),
            refusalReason: reason
          }
        : r
    );
    await saveRequests(nextRequests);
    pushSystemNotification(tenant, {
      title: `Solicitação Recusada • OS #${refuseModalReq.osNumber}`,
      message: `${refuseModalReq.partName}: ${reason}`,
      category: 'ESTOQUE',
      severity: 'WARNING',
      targetRoles: ['Mecânico', 'Funcionário', 'Dono', 'Gerente'],
      relatedPath: '/terminal',
      relatedId: refuseModalReq.osId
    });
    setRefuseModalReq(null);
    setRefuseReason('');
    showNotice('Solicitação atualizada como recusada.');
  };

  const pendingRequests = useMemo(() => requests.filter(r => r.status === 'PENDENTE'), [requests]);
  const criticalItems = useMemo(() => parts.filter(p => (Number(p.stock) || 0) <= (Number(p.minStock) || 0)), [parts]);
  const totalSaleValue = useMemo(() => parts.reduce((acc, p) => acc + (p.stock || 0) * (p.salePrice || 0), 0), [parts]);
  const totalCostValue = useMemo(() => parts.reduce((acc, p) => acc + (p.stock || 0) * (p.costPrice || 0), 0), [parts]);

  const filteredParts = (activeTab === 'MINIMO' ? criticalItems : parts).filter(
    p =>
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1300px] min-w-0 px-3 sm:px-6 space-y-6 pb-28 animate-in fade-in duration-500">
      {bannerMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-bold flex items-center justify-between">
          <span>{bannerMsg}</span>
          <button onClick={() => setBannerMsg(null)} className="cursor-pointer"><X size={16} /></button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF2D55] block mb-1">
            Módulo 05 • Setor de Estoque & Suprimentos
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
            Estoque, Peças & Solicitações
          </h1>
          <p className="text-zinc-400 text-xs mt-1 flex items-center gap-2">
            <RefreshCw size={12} className="text-[#FF2D55]" />
            Custo x Venda, histórico de movimentações e atendimento em tempo real às requisições dos mecânicos.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-4 bg-[#FF2D55] hover:bg-[#e02448] rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 text-white shadow-xl shadow-[#FF2D55]/25 cursor-pointer shrink-0"
        >
          <Plus size={18} /> Cadastrar Nova Peça
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-white/10 p-5 rounded-3xl">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">SKUs Ativos</p>
          <p className="text-3xl font-black text-white font-mono tabular-nums">{parts.length}</p>
        </div>
        <div className="bg-zinc-950 border border-amber-500/25 p-5 rounded-3xl">
          <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1">Solicitações Pendentes</p>
          <p className="text-3xl font-black text-amber-400 font-mono tabular-nums">{pendingRequests.length}</p>
        </div>
        <div className="bg-zinc-950 border border-red-500/25 p-5 rounded-3xl">
          <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-1">Abaixo do Mínimo</p>
          <p className="text-3xl font-black text-red-400 font-mono tabular-nums">{criticalItems.length}</p>
        </div>
        <div className="bg-zinc-950 border border-emerald-500/25 p-5 rounded-3xl">
          <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Valor em Estoque (Venda / Custo)</p>
          <p className="text-xl font-black text-emerald-400 font-mono tabular-nums">
            R$ {totalSaleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">
            Custo: R$ {totalCostValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-950 border border-white/10 rounded-2xl overflow-x-auto">
        {[
          { id: 'CATALOGO', label: `Catálogo (${parts.length})`, icon: Box },
          { id: 'SOLICITACOES', label: `Solicitações Mecânicos (${pendingRequests.length})`, icon: ClipboardList },
          { id: 'MOVIMENTACOES', label: `Movimentações (${movements.length})`, icon: History },
          { id: 'MINIMO', label: `Alerta Mínimo (${criticalItems.length})`, icon: AlertTriangle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-all ${
              activeTab === tab.id ? 'bg-[#FF2D55] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1 & 4: CATALOGO / MINIMO */}
      {(activeTab === 'CATALOGO' || activeTab === 'MINIMO') && (
        <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden">
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar peça por nome, SKU ou marca..."
                className="w-full bg-black border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-white outline-none focus:border-[#FF2D55]"
              />
            </div>
            {criticalItems.length > 0 && (
              <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1.5">
                <AlertCircle size={13} /> {criticalItems.length} itens precisando reposição
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/60 text-zinc-500 text-[9px] uppercase tracking-widest font-black">
                  <th className="px-6 py-4">Peça / SKU / Local</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-center">Saldo</th>
                  <th className="px-4 py-4 text-center">Ajuste Rápido</th>
                  <th className="px-4 py-4 text-right">Custo / Venda</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredParts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-zinc-500 text-xs">
                      Nenhuma peça encontrada nesta listagem.
                    </td>
                  </tr>
                ) : (
                  filteredParts.map(p => {
                    const isCritical = (Number(p.stock) || 0) <= (Number(p.minStock) || 0);
                    const rawAdj = adjustments[p.id];
                    const numericAdj = getNumericAdjustment(p.id);
                    const displayAdj = rawAdj === undefined ? '' : rawAdj;
                    const margin = p.salePrice > 0 && p.costPrice > 0
                      ? (((p.salePrice - p.costPrice) / p.salePrice) * 100).toFixed(0)
                      : null;

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4">
                          <p className="text-xs font-black text-white uppercase">{p.name}</p>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-0.5">
                            <span>SKU: {p.sku || 'S/N'}</span>
                            {p.brand && <span>• {p.brand}</span>}
                            {p.location && (
                              <span className="text-sky-400 flex items-center gap-0.5">
                                <MapPin size={10} /> {p.location}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {isCritical ? (
                            <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                              <AlertCircle size={13} /> Mín: {p.minStock}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                              <Check size={13} /> Normal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-lg font-black font-mono tabular-nums ${isCritical ? 'text-amber-400' : 'text-white'}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center bg-black rounded-xl border border-white/10 p-0.5">
                              <button
                                type="button"
                                onClick={() => setAdjustments({ ...adjustments, [p.id]: numericAdj - 1 })}
                                className="p-1.5 text-zinc-400 hover:text-red-400 cursor-pointer"
                              >
                                <ArrowDown size={14} />
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={displayAdj}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || val === '-' || /^-?\d+$/.test(val)) {
                                    setAdjustments({ ...adjustments, [p.id]: val });
                                  }
                                }}
                                placeholder="0"
                                className="w-12 bg-transparent text-center text-xs font-mono font-bold text-white outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setAdjustments({ ...adjustments, [p.id]: numericAdj + 1 })}
                                className="p-1.5 text-zinc-400 hover:text-emerald-400 cursor-pointer"
                              >
                                <ArrowUp size={14} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjust(p)}
                              disabled={numericAdj === 0}
                              className={`p-2 rounded-xl cursor-pointer ${
                                numericAdj !== 0 ? 'bg-[#FF2D55] text-white' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                              }`}
                              title="Confirmar ajuste de estoque"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="text-xs font-mono font-black text-white">
                            R$ {(Number(p.salePrice) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] font-mono text-zinc-500">
                            Custo: R$ {(Number(p.costPrice) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {margin ? ` (${margin}%)` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 text-zinc-600 hover:text-red-400 rounded-lg cursor-pointer"
                            title="Excluir peça"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SOLICITACOES DOS MECANICOS */}
      {activeTab === 'SOLICITACOES' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="p-14 text-center bg-zinc-950 border border-dashed border-white/10 rounded-3xl space-y-2">
              <ClipboardList size={32} className="mx-auto text-zinc-700" />
              <p className="text-sm font-bold text-zinc-400">Nenhuma solicitação de peça recebida ainda.</p>
              <p className="text-xs text-zinc-600">Quando um mecânico solicitar peças pelo Terminal do Mecânico, elas aparecerão aqui vinculadas à OS.</p>
            </div>
          ) : (
            requests.map(req => (
              <div
                key={req.id}
                className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  req.status === 'PENDENTE'
                    ? req.urgency === 'URGENTE'
                      ? 'bg-red-950/20 border-red-500/40'
                      : 'bg-zinc-950 border-amber-500/30'
                    : 'bg-zinc-950/60 border-white/10 opacity-80'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                      OS #{req.osNumber}
                    </span>
                    <span className="text-xs font-mono font-black text-[#FF2D55]">{req.vehiclePlate}</span>
                    <span className="text-xs text-zinc-400">{req.vehicleModel}</span>
                    {req.urgency === 'URGENTE' && req.status === 'PENDENTE' && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-500 text-white">
                        URGENTE
                      </span>
                    )}
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                      req.status === 'ATENDIDA'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : req.status === 'RECUSADA'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-base font-black text-white uppercase">
                    {req.quantity}x {req.partName}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Solicitado por <strong className="text-white">{req.mechanicName}</strong> em {new Date(req.requestedAt).toLocaleString('pt-BR')}
                    {req.notes ? ` • Obs: ${req.notes}` : ''}
                  </p>
                  {req.fulfilledBy && (
                    <p className="text-[11px] text-zinc-500">
                      Tratado por {req.fulfilledBy} em {req.fulfilledAt ? new Date(req.fulfilledAt).toLocaleString('pt-BR') : ''}
                      {req.refusalReason ? ` • Motivo: ${req.refusalReason}` : ''}
                    </p>
                  )}
                </div>

                {req.status === 'PENDENTE' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openFulfillModal(req)}
                      className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={16} /> Atender e Vincular à OS
                    </button>
                    <button
                      onClick={() => {
                        setRefuseModalReq(req);
                        setRefuseReason('');
                      }}
                      className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 rounded-2xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle size={16} /> Recusar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: MOVIMENTACOES */}
      {activeTab === 'MOVIMENTACOES' && (
        <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/60 text-zinc-500 text-[9px] uppercase tracking-widest font-black">
                  <th className="px-6 py-4">Data / Hora</th>
                  <th className="px-4 py-4">Tipo</th>
                  <th className="px-4 py-4">Peça</th>
                  <th className="px-4 py-4 text-center">Qtd</th>
                  <th className="px-4 py-4">Motivo / OS</th>
                  <th className="px-4 py-4">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-zinc-500">
                      Nenhuma movimentação registrada ainda.
                    </td>
                  </tr>
                ) : (
                  movements.map(m => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-3.5 font-mono text-[11px] text-zinc-400">
                        {new Date(m.date).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          m.type === 'INBOUND'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : m.type === 'OUTBOUND'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-sky-500/15 text-sky-400'
                        }`}>
                          {m.type === 'INBOUND' ? 'Entrada' : m.type === 'OUTBOUND' ? 'Saída' : 'Ajuste'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-white uppercase">{m.partName}</td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-white">{m.quantity}</td>
                      <td className="px-4 py-3.5 text-zinc-400">
                        {m.osNumber ? <span className="text-[#FF2D55] font-mono font-bold mr-1.5">OS #{m.osNumber}</span> : null}
                        {m.reason}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-300 font-semibold">{m.userName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NEW PRODUCT */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-zinc-950 border border-white/10 w-full max-w-xl p-6 sm:p-8 rounded-3xl shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white cursor-pointer">
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-[#FF2D55] rounded-2xl flex items-center justify-center text-white">
                <Package size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white uppercase">Cadastrar Nova Peça</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Catálogo MM Car Auto Center</p>
              </div>
            </div>

            <form onSubmit={handleSavePart} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Nome da Peça / Aplicação *</label>
                <input
                  type="text"
                  required
                  value={newPart.name}
                  onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                  placeholder="Ex: Pastilha Freio Dianteira Bosch Civic 2018+"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-[#FF2D55]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">SKU / Código</label>
                  <input
                    type="text"
                    value={newPart.sku}
                    onChange={(e) => setNewPart({ ...newPart, sku: e.target.value })}
                    placeholder="MM-1024"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Marca</label>
                  <input
                    type="text"
                    value={newPart.brand}
                    onChange={(e) => setNewPart({ ...newPart, brand: e.target.value })}
                    placeholder="Bosch / Nakata"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Local / Prateleira</label>
                  <input
                    type="text"
                    value={newPart.location}
                    onChange={(e) => setNewPart({ ...newPart, location: e.target.value })}
                    placeholder="Corredor B-04"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPart.costPrice || ''}
                    onChange={(e) => setNewPart({ ...newPart, costPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0,00"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-xs text-white font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPart.salePrice || ''}
                    onChange={(e) => setNewPart({ ...newPart, salePrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0,00"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-xs text-white font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Saldo Inicial</label>
                  <input
                    type="number"
                    value={newPart.stock || ''}
                    onChange={(e) => setNewPart({ ...newPart, stock: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-xs text-white font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Estoque Mín.</label>
                  <input
                    type="number"
                    value={newPart.minStock || ''}
                    onChange={(e) => setNewPart({ ...newPart, minStock: parseFloat(e.target.value) || 0 })}
                    placeholder="2"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-xs text-white font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#FF2D55] hover:bg-[#e02448] py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white cursor-pointer"
              >
                Salvar Peça no Estoque
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Atender Solicitação do Mecânico */}
      {fulfillModalReq && (
        <div className="fixed inset-0 z-[210] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-emerald-500/30 rounded-3xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400">Baixa & Vinculação Automática à OS #{fulfillModalReq.osNumber}</span>
                <h3 className="text-base font-black text-white uppercase">Atender Solicitação de Peça</h3>
              </div>
              <button onClick={() => setFulfillModalReq(null)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>

            <div className="p-3.5 bg-black/60 border border-white/10 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-white">{fulfillModalReq.quantity}x {fulfillModalReq.partName}</p>
              <p className="text-zinc-400">Mecânico: {fulfillModalReq.mechanicName} • Veículo: {fulfillModalReq.vehiclePlate} ({fulfillModalReq.vehicleModel})</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase">Vincular Item do Catálogo (para baixa automática)</label>
              <select
                value={fulfillCatalogPartId}
                onChange={(e) => {
                  const id = e.target.value;
                  setFulfillCatalogPartId(id);
                  const found = parts.find(p => p.id === id);
                  if (found) {
                    setFulfillUnitCost(String(found.costPrice || 0));
                    setFulfillUnitSale(String(found.salePrice || 0));
                  }
                }}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white font-bold outline-none"
              >
                <option value="">Peça Avulsa / Compra Direta (Sem baixa de catálogo)</option>
                {parts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Saldo: {p.stock} | Venda: R$ {p.salePrice.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase">Custo Unitário Real (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={fulfillUnitCost}
                  onChange={(e) => setFulfillUnitCost(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase">Valor Venda na OS (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={fulfillUnitSale}
                  onChange={(e) => setFulfillUnitSale(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold text-emerald-400"
                />
              </div>
            </div>

            <button
              onClick={handleConfirmFulfill}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-black uppercase text-xs cursor-pointer"
            >
              Confirmar Baixa e Adicionar à OS #{fulfillModalReq.osNumber}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Recusar Solicitação */}
      {refuseModalReq && (
        <div className="fixed inset-0 z-[210] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-red-500/30 rounded-3xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase text-red-400">Recusar Solicitação</h3>
              <button onClick={() => setRefuseModalReq(null)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <p className="text-xs text-zinc-400">
              {refuseModalReq.quantity}x {refuseModalReq.partName} para OS #{refuseModalReq.osNumber}. Informe o motivo para o mecânico:
            </p>
            <textarea
              rows={3}
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              placeholder="Ex: Sem saldo em estoque, pedido em cotação com fornecedor..."
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
            />
            <button onClick={handleConfirmRefuse} className="w-full py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs cursor-pointer">
              Confirmar Recusa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
