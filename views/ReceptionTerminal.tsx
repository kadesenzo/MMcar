import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, CheckCircle2, AlertTriangle, FileText, Printer, 
  Send, DollarSign, Wrench, Search, ChevronRight, 
  RefreshCcw, User, Check, Play, Edit2, Badge, X, Camera
} from 'lucide-react';
import { ServiceOrder, OSStatus, PaymentStatus, UserSession, Part, Client } from '../types';
import Invoice from '../components/Invoice';
import PatioCheckinModal from '../components/PatioCheckinModal';
import AntesEDepoisModal from '../components/AntesEDepoisModal';

interface ReceptionTerminalProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const ReceptionTerminal: React.FC<ReceptionTerminalProps> = ({ session, syncData }) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [showPatioModal, setShowPatioModal] = useState(false);
  const [selectedAntesDepoisOs, setSelectedAntesDepoisOs] = useState<ServiceOrder | null>(null);

  // Load state and listen to local updates in real-time
  useEffect(() => {
    if (session) {
      const loadData = () => {
        setOrders(JSON.parse(localStorage.getItem(`kaenpro_${session.username}_orders`) || '[]'));
        setParts(JSON.parse(localStorage.getItem(`kaenpro_${session.username}_parts`) || '[]'));
        setClients(JSON.parse(localStorage.getItem(`kaenpro_${session.username}_clients`) || '[]'));
      };
      
      loadData();
      window.addEventListener('kaen_storage_updated', loadData);
      // Polling as a robust safety fallback
      const interval = setInterval(loadData, 3000);
      return () => {
        window.removeEventListener('kaen_storage_updated', loadData);
        clearInterval(interval);
      };
    }
  }, [session]);

  const addLog = async (action: string) => {
    if (!session) return;
    const currentLogs = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_admin_logs`) || '[]');
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      user: session.username,
      device: navigator.userAgent.includes('Mobile') ? 'Tablet/Mobile' : 'Computador Desktop',
      action,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...currentLogs];
    if (syncData) {
      await syncData('admin_logs', nextLogs);
    } else {
      localStorage.setItem(`kaenpro_${session.username}_admin_logs`, JSON.stringify(nextLogs));
      window.dispatchEvent(new CustomEvent('kaen_storage_updated'));
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OSStatus) => {
    if (!session || !syncData) return;
    const updated = orders.map(o => {
      if (o.id === orderId) {
        addLog(`Secretaria alterou status da OS #${o.osNumber} para ${newStatus}`);
        return {
          ...o,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    });
    setOrders(updated);
    await syncData('orders', updated);
  };

  const handleEditBudget = (order: ServiceOrder) => {
    // Check administrative / user permission
    const permissions = JSON.parse(localStorage.getItem(`kaenpro_${session?.username}_permissions`) || '{"canEditPrices":true,"canDelete":true,"canCloseOS":true}');
    if (!permissions.canEditPrices) {
      alert("ACESSO NEGADO: Você não tem permissão para editar preços ou orçamentos. Contate o Administrador.");
      return;
    }
    setEditingOrder({ ...order });
  };

  const handleSaveBudget = async () => {
    if (!editingOrder || !session || !syncData) return;
    
    // Recalculate total value
    const itemsTotal = editingOrder.items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
    const updatedFinal = {
      ...editingOrder,
      totalValue: itemsTotal + editingOrder.laborValue,
      updatedAt: new Date().toISOString()
    };

    const updated = orders.map(o => o.id === editingOrder.id ? updatedFinal : o);
    setOrders(updated);
    await syncData('orders', updated);
    addLog(`Secretaria reajustou o orçamento da OS #${editingOrder.osNumber} para R$ ${updatedFinal.totalValue.toLocaleString('pt-BR')}`);
    setEditingOrder(null);
    if (selectedOrder?.id === updatedFinal.id) {
      setSelectedOrder(updatedFinal);
    }
    alert("Orçamento atualizado com sucesso!");
  };

  const handleFinalizeService = async (order: ServiceOrder) => {
    const permissions = JSON.parse(localStorage.getItem(`kaenpro_${session?.username}_permissions`) || '{"canEditPrices":true,"canDelete":true,"canCloseOS":true}');
    if (!permissions.canCloseOS) {
      alert("ACESSO NEGADO: Você não tem permissão para fechar Ordens de Serviço. Contate o Administrador.");
      return;
    }

    if (!session || !syncData) return;
    const updated = orders.map(o => {
      if (o.id === order.id) {
        addLog(`Atendimento Finalizado para a OS #${o.osNumber}. Nota emitida.`);
        return {
          ...o,
          status: OSStatus.FINALIZADO,
          paymentStatus: PaymentStatus.PAGO,
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    });
    setOrders(updated);
    await syncData('orders', updated);
    
    // Auto add transaction to financial if not loaded
    const savedTransactions = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_transactions`) || '[]');
    const newTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'INCOME',
      category: 'Serviço Automotivo',
      amount: order.totalValue,
      method: 'PIX',
      description: `OS #${order.osNumber} - ${order.clientName} (${order.vehiclePlate})`,
      relatedId: order.id,
      date: new Date().toISOString()
    };
    localStorage.setItem(`kaenpro_${session.username}_transactions`, JSON.stringify([newTransaction, ...savedTransactions]));
    await syncData('transactions', [newTransaction, ...savedTransactions]);

    // Track in admin_invoices for real-time monitoring under AdminPanel
    try {
      const savedInvoices = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_admin_invoices`) || '[]');
      const newInvoiceObj = {
        id: `inv-${Date.now()}`,
        osNumber: order.osNumber,
        client: order.clientName,
        value: order.totalValue,
        status: 'AUTENTICADA' as const,
        reason: 'Sucesso absoluto - emitida via terminal recepção',
        timestamp: new Date().toISOString(),
        resolved: true
      };
      const updatedInvoices = [newInvoiceObj, ...savedInvoices];
      localStorage.setItem(`kaenpro_${session.username}_admin_invoices`, JSON.stringify(updatedInvoices));
      await syncData('admin_invoices', updatedInvoices);
    } catch (err) {
      console.error("Failed to sync invoice to admin monitoring logs", err);
    }

    alert("ATENDIMENTO FINALIZADO COM SUCESSO! Nota fiscal emitida e lançada no fluxo de caixa.");
    setSelectedOrder(null);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.clientName.toLowerCase().includes(search.toLowerCase()) ||
      o.vehiclePlate.toLowerCase().includes(search.toLowerCase()) ||
      o.osNumber.includes(search)
    );
  }, [orders, search]);

  // Group by status context for clear visibility
  const waitingReceptionCount = useMemo(() => {
    // Orders marked as EN_ANDAMENTO but completed by mechanic can be marked with a special local property, OR are simply EN_ANDAMENTO waiting checkout.
    // Let's look for orders where status is EM_ANDAMENTO but mechanic flagged them
    return orders.filter(o => o.status === OSStatus.EM_ANDAMENTO || o.problem.includes('CONCLUÍDO PELO MECÂNICO')).length;
  }, [orders]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 p-6 md:p-14 pb-48 w-full max-w-[1400px]">
      
      {/* Reception Panel Intro Header */}
      <div className="w-full glass-card p-12 rounded-[4rem] border border-white/5 relative overflow-hidden group shadow-2xl">
         <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none"></div>
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 relative z-10">
            <div>
               <div className="flex items-center gap-5 mb-5">
                  <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-black shadow-xl border border-white/20">
                     <Users size={28} />
                  </div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter text-left">ÁREA DA <span className="text-emerald-500 font-extrabold text-glow">RECEPCIONISTA</span></h2>
               </div>
               <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] italic text-left">Front-desk operacional e fluxo financeiro em tempo real</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowPatioModal(true)}
                className="px-6 py-4 bg-[#FF2D55] hover:bg-[#ff1744] text-white rounded-3xl font-black uppercase text-xs tracking-widest flex items-center gap-2.5 shadow-xl shadow-[#FF2D55]/30 active:scale-95 transition-all cursor-pointer border border-[#FF2D55]"
              >
                <Camera size={18} />
                <span>Check-in de Pátio (Foto & Vistoria)</span>
              </button>

              <div className="px-6 py-4 bg-zinc-950/80 border border-white/5 rounded-3xl text-left">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Aguardando Recepção</span>
                <span className="text-xl font-black text-emerald-500 animate-pulse">{waitingReceptionCount} Serviços</span>
              </div>
            </div>
         </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: List of Worksheets sent by Mechanics */}
        <div className="lg:col-span-7 space-y-8">
          <div className="glass-card p-10 rounded-[3.5rem] border border-white/5 shadow-xl">
            <h3 className="text-xl font-black italic tracking-tighter mb-8 uppercase text-left">FILA DE ATENDIMENTOS</h3>
            
            {/* Search filter */}
            <div className="relative bg-black/40 border border-white/5 rounded-full px-6 py-4 flex items-center mb-8">
              <Search className="text-zinc-600 mr-4" size={20} />
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="PROCURAR POR PLACA, STATUS OU CLIENTE..." 
                className="bg-transparent border-none text-xs font-black uppercase tracking-widest text-white outline-none w-full placeholder-zinc-700"
              />
            </div>

            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
              {filteredOrders.length === 0 ? (
                <div className="p-16 text-center text-zinc-600 font-black uppercase text-[10px] tracking-widest italic border border-dashed border-white/5 rounded-3xl">
                  Nenhuma ordem de serviço pendente para revisão.
                </div>
              ) : (
                filteredOrders.map(os => {
                  const isSentByMechanic = os.problem.includes('CONCLUÍDO PELO MECÂNICO') || os.status === OSStatus.EM_ANDAMENTO;
                  return (
                    <div 
                      key={os.id} 
                      onClick={() => setSelectedOrder(os)}
                      className={`p-6 rounded-ios border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group
                      ${selectedOrder?.id === os.id 
                        ? 'bg-emerald-500/5 border-emerald-500/40 shadow-xl' 
                        : 'bg-[#0F0F0F] border-white/5 hover:border-white/10'}`}
                    >
                      {isSentByMechanic && (
                        <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-500 text-[8px] font-bold px-4 py-1 rounded-bl-xl uppercase tracking-widest border-l border-b border-emerald-500/20">
                          MECÂNICO CONCLUIU
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4">
                        <div className="text-left">
                          <span className="text-[10px] font-black text-[#FF2D55] tracking-widest uppercase italic block mb-1">OS #{os.osNumber}</span>
                          <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">{os.clientName}</h4>
                        </div>
                        <div className="text-right">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-center block
                            ${os.status === OSStatus.EM_ANDAMENTO ? 'bg-amber-500/15 text-amber-500' :
                              os.status === OSStatus.FINALIZADO ? 'bg-emerald-500/15 text-emerald-500' :
                              os.status === OSStatus.ORCAMENTO ? 'bg-blue-500/15 text-blue-500' : 'bg-zinc-800 text-zinc-400'}`}>
                            {os.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-3 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-3">
                          <Wrench className="text-zinc-700" size={16} />
                          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-tight">{os.vehicleModel} ({os.vehiclePlate})</span>
                        </div>

                        {/* Discrete final price visually styled as per user guidelines */}
                        <div className="text-right">
                          <span className="text-[8px] font-black text-zinc-600 block uppercase tracking-widest">TOTAL</span>
                          <span className="text-sm font-semibold text-zinc-400">R$ {os.totalValue.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Action details */}
        <div className="lg:col-span-5">
          {selectedOrder ? (
            <div className="glass-card p-10 rounded-[3.5rem] border border-white/5 space-y-8 shadow-xl text-left animate-in slide-in-from-right-6 duration-500">
              
              {/* Header Details */}
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">DETALHES DO SERVIÇO</span>
                  <p className="text-xl font-black text-white italic uppercase tracking-tighter">OS #{selectedOrder.osNumber}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-3 bg-white/5 border border-white/10 text-zinc-500 hover:text-white rounded-full transition-transform active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status information */}
              <div className="space-y-4">
                <div className="p-5 bg-black/60 rounded-3xl border border-white/5 w-full flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block">STATUS ATUAL</span>
                    <span className="text-sm font-black text-zinc-300 uppercase italic tracking-tighter">{selectedOrder.status}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, OSStatus.ORCAMENTO)}
                      className="px-3 py-2 bg-blue-500/10 text-blue-500 text-[9px] font-black rounded-xl uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                    >
                      Orçamento
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, OSStatus.EM_ANDAMENTO)}
                      className="px-3 py-2 bg-amber-500/10 text-amber-500 text-[9px] font-black rounded-xl uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
                    >
                      Em Execução
                    </button>
                  </div>
                </div>

                {/* Cliente / Veiculo detailed grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-950/50 rounded-2xl border border-white/5">
                    <span className="text-[8px] font-black text-zinc-600 block uppercase tracking-widest">CLIENTE</span>
                    <span className="text-xs font-black text-white block truncate uppercase">{selectedOrder.clientName}</span>
                    <span className="text-[10px] text-zinc-400 block mt-1">{selectedOrder.clientPhone || 'Sem celular'}</span>
                  </div>
                  <div className="p-4 bg-zinc-950/50 rounded-2xl border border-white/5">
                    <span className="text-[8px] font-black text-zinc-600 block uppercase tracking-widest">VEÍCULO / PLACA</span>
                    <span className="text-xs font-black text-white block uppercase truncate">{selectedOrder.vehicleModel}</span>
                    <span className="text-[10px] text-[#FF2D55] font-black block mt-1">{selectedOrder.vehiclePlate}</span>
                  </div>
                </div>

                {/* Mechanic Prontuary / problem description */}
                <div className="p-5 bg-black/60 rounded-3xl border border-white/5">
                  <span className="text-[9px] font-black text-[#FF2D55] uppercase tracking-widest block mb-1">PRONTUÁRIO TÉCNICO (MECÂNICO)</span>
                  <div className="text-xs text-zinc-300 bg-black/80 p-4 rounded-xl border border-white/5 font-mono max-h-24 overflow-y-auto leading-relaxed">
                    {selectedOrder.problem || 'Nenhuma anotação descrita pelo mecânico.'}
                  </div>
                </div>

                {/* Items in OS List */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block">ITENS DO ORÇAMENTO</span>
                  <div className="max-h-40 overflow-y-auto pr-1 space-y-2 no-scrollbar">
                    {selectedOrder.items.map((item, index) => (
                      <div key={item.id} className="flex justify-between items-center p-3.5 bg-zinc-900/40 rounded-xl border border-white/5 text-[11px]">
                        <span className="font-bold text-zinc-300 uppercase max-w-[200px] truncate">{item.quantity}x {item.description}</span>
                        <span className="font-mono text-zinc-400">R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR')}</span>
                      </div>
                    ))}
                    {selectedOrder.laborValue > 0 && (
                      <div className="flex justify-between items-center p-3.5 bg-blue-900/10 rounded-xl border border-blue-500/15 text-[11px]">
                        <span className="font-black text-blue-400 uppercase">MÃO DE OBRA MECÂNICA</span>
                        <span className="font-mono text-blue-300">R$ {selectedOrder.laborValue.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total pricing area (Discreet on top as per design direction) */}
                <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                  <div>
                    <span className="text-[9px] font-black text-zinc-600 block uppercase tracking-widest">TOTAL ACUMULADO</span>
                    <span className="text-xl font-medium text-zinc-400">R$ {selectedOrder.totalValue.toLocaleString('pt-BR')}</span>
                  </div>
                  <button 
                    onClick={() => handleEditBudget(selectedOrder)}
                    className="flex items-center gap-2 text-[9px] font-black text-[#FF2D55] uppercase tracking-widest hover:text-white transition-colors"
                  >
                    <Edit2 size={12} /> Ajustar Orçamento
                  </button>
                </div>

                {/* Main Interaction Pipeline Buttons */}
                <div className="pt-4 grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowInvoiceModal(true)}
                    className="py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 italic cursor-pointer"
                  >
                    <FileText size={16} /> Emitir Nota
                  </button>
                  <button 
                    onClick={() => handleFinalizeService(selectedOrder)}
                    className="py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 italic cursor-pointer"
                  >
                    <CheckCircle2 size={16} /> Finalizar OS
                  </button>

                  {/* Vistoria Antes e Depois button */}
                  <button
                    onClick={() => setSelectedAntesDepoisOs(selectedOrder)}
                    className="col-span-2 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-white/10 hover:border-[#FF2D55]/50 transition-all active:scale-95 italic cursor-pointer"
                  >
                    <Camera size={15} className="text-[#FF2D55]" />
                    <span>Vistoria Fotográfica: Fotos Antes & Depois</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-[#0F0F0F] border border-dashed border-white/5 p-20 rounded-[3.5rem] h-[400px] flex flex-col items-center justify-center text-center gap-4">
              <Users size={48} className="text-zinc-800" />
              <div>
                <h4 className="font-black uppercase tracking-tighter italic text-zinc-400">Nenhuma Ordem Selecionada</h4>
                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-2">Clique em um atendimento ao lado para faturar, ajustar ou finalizar</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Editing Budget Modal Backdrop */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[160] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0F0F0F] border border-white/10 p-8 rounded-[3rem] space-y-6 text-left shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-lg font-black uppercase italic tracking-tighter">AJUSTAR VALORES - OS #{editingOrder.osNumber}</h3>
              <button onClick={() => setEditingOrder(null)} className="text-zinc-600 hover:text-white"><X size={20}/></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Mão de Obra Mecânica</label>
                <input 
                  type="number" 
                  value={editingOrder.laborValue} 
                  onChange={(e) => setEditingOrder({ ...editingOrder, laborValue: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-black outline-none tracking-widest"
                />
              </div>

              {editingOrder.items.map((item, index) => (
                <div key={item.id} className="p-4 bg-zinc-950 rounded-xl border border-white/5 space-y-4">
                  <p className="text-[9px] font-black text-[#FF2D55] uppercase tracking-widest italic">{item.type} - {item.description || "Sem Descrição"}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Quantidade</label>
                      <input 
                        type="number" 
                        value={item.quantity} 
                        onChange={(e) => {
                          const updatedItems = [...editingOrder.items];
                          updatedItems[index] = { ...item, quantity: parseFloat(e.target.value) || 0 };
                          setEditingOrder({ ...editingOrder, items: updatedItems });
                        }}
                        className="w-full bg-black border border-white/5 p-3 rounded-lg text-white font-mono text-xs text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Preço Unitário (R$)</label>
                      <input 
                        type="number" 
                        value={item.unitPrice} 
                        onChange={(e) => {
                          const updatedItems = [...editingOrder.items];
                          updatedItems[index] = { ...item, unitPrice: parseFloat(e.target.value) || 0 };
                          setEditingOrder({ ...editingOrder, items: updatedItems });
                        }}
                        className="w-full bg-black border border-white/5 p-3 rounded-lg text-white font-mono text-xs text-right"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleSaveBudget}
              className="w-full bg-[#FF2D55] py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-red-600 transition-colors active:scale-95 shadow-lg"
            >
              Confirmar Ajuste
            </button>
          </div>
        </div>
      )}

      {/* Invoice Modal Preview */}
      {showInvoiceModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[160] flex items-center justify-center p-4 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-[850px] flex flex-col items-center gap-12 my-20">
            <button 
              onClick={() => setShowInvoiceModal(false)}
              className="fixed top-10 right-10 text-white bg-white/10 p-5 rounded-full hover:bg-[#FF2D55] transition-all z-[170] border border-white/10 active:scale-90"
            >
              <X size={24} />
            </button>

            <div className="invoice-preview-wrapper">
              <div className="invoice-container-scaled">
                <Invoice os={selectedOrder} />
              </div>
            </div>

            <div className="flex gap-4 w-full justify-center max-w-sm">
              <button 
                onClick={() => window.print()}
                className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 italic"
              >
                <Printer size={16} /> Imprimir em A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patio Check-in Modal */}
      {showPatioModal && (
        <PatioCheckinModal
          isOpen={showPatioModal}
          onClose={() => setShowPatioModal(false)}
          session={session}
          syncData={syncData}
          onSuccess={(newOs) => {
            setShowPatioModal(false);
            setOrders(prev => [newOs, ...prev]);
            setSelectedOrder(newOs);
          }}
        />
      )}

      {/* Antes e Depois Modal */}
      {selectedAntesDepoisOs && (
        <AntesEDepoisModal
          isOpen={!!selectedAntesDepoisOs}
          onClose={() => setSelectedAntesDepoisOs(null)}
          os={selectedAntesDepoisOs}
          session={session}
          syncData={syncData}
        />
      )}

    </div>
  );
};

export default ReceptionTerminal;
