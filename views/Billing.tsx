
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  Search,
  Users,
  Calendar,
  X,
  History
} from 'lucide-react';
import { ServiceOrder, PaymentStatus, Client, UserSession } from '../types';

const Billing: React.FC<{ session?: UserSession; syncData?: (key: string, data: any) => Promise<void> }> = ({ session, syncData }) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [billingLevel, setBillingLevel] = useState<'mild' | 'formal' | 'final'>('mild');

  const loadData = () => {
    if (session) {
      const savedOrders = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_orders`) || '[]');
      const savedClients = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_clients`) || '[]');
      
      // Check for late payments automatically on load
      const today = new Date();
      const checkedOrders = savedOrders.map((os: ServiceOrder) => {
        if (os.paymentStatus !== PaymentStatus.PAGO) {
          const osDate = new Date(os.createdAt);
          const diffTime = Math.abs(today.getTime() - osDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 7 && os.paymentStatus === PaymentStatus.PENDENTE) {
            return { ...os, paymentStatus: PaymentStatus.ATRASADO };
          }
        }
        return os;
      });

      setOrders(checkedOrders);
      setClients(savedClients);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [session]);

  const handleMarkAsPaid = async (id: string) => {
    if (!session || !syncData) return;
    if (confirm("Confirmar recebimento deste pagamento?")) {
      const updated = orders.map(o => o.id === id ? { ...o, paymentStatus: PaymentStatus.PAGO, updatedAt: new Date().toISOString() } : o);
      setOrders(updated);
      await syncData('orders', updated);
      setSelectedOrder(null);
    }
  };

  const getDaysInArrears = (createdAt: string) => {
    const today = new Date();
    const osDate = new Date(createdAt);
    const diffTime = Math.abs(today.getTime() - osDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const overdueOrders = orders.filter(o => o.paymentStatus !== PaymentStatus.PAGO);
  
  const filtered = overdueOrders.filter(o => 
    o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.osNumber.includes(searchTerm)
  );

  const totalInArrears = overdueOrders.reduce((acc, curr) => acc + curr.totalValue, 0);
  const debtorCount = new Set(overdueOrders.map(o => o.clientId)).size;

  const getBillingMessage = (os: ServiceOrder) => {
    const client = clients.find(c => c.id === os.clientId);
    const dateStr = new Date(os.createdAt).toLocaleDateString('pt-BR');
    
    const baseMessages = {
      mild: `Olá, ${os.clientName}! Passando para lembrar da nota #${os.osNumber} (R$ ${os.totalValue.toLocaleString('pt-BR')}). Precisando de algo ou do link para pagamento? Abraço!`,
      formal: `AVISO FINANCEIRO: Prezado(a) ${os.clientName}, consta em aberto o serviço #${os.osNumber} no valor de R$ ${os.totalValue.toLocaleString('pt-BR')}. Solicitamos a regularização ou o envio do comprovante.`,
      final: `URGENTE: Notificação final de débito - OS #${os.osNumber}. Sr(a) ${os.clientName}, pedimos contato imediato para evitar restrições em seu cadastro conosco.`
    };

    return baseMessages[billingLevel];
  };

  const sendWhatsApp = async (os: ServiceOrder) => {
    const client = clients.find(c => c.id === os.clientId);
    if (!client) return;

    const message = getBillingMessage(os);
    const phone = client.phone.replace(/\D/g, '');
    
    const historyEntry = {
      date: new Date().toISOString(),
      user: 'Admin',
      level: billingLevel
    };
    
    const updatedOrders = orders.map(o => o.id === os.id ? { 
      ...o, 
      billingHistory: [...(o.billingHistory || []), historyEntry] 
    } : o);
    
    setOrders(updatedOrders);
    if (session && syncData) {
      await syncData('orders', updatedOrders);
    } else {
      localStorage.setItem(`kaenpro_${session?.username || 'rafael'}_orders`, JSON.stringify(updatedOrders));
    }
    
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Área de Cobrança</h1>
          <p className="text-zinc-500">Gestão de inadimplência e notificações financeiras.</p>
        </div>
        <div className="bg-[#A32121]/10 px-4 py-2 rounded-xl text-xs font-black text-[#A32121] border border-[#A32121]/20">
          Relatório de Débitos
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <DollarSign size={80} />
          </div>
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">Total a Receber</p>
          <p className="text-3xl font-black text-white">R$ {totalInArrears.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] group">
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">Clientes Devedores</p>
          <p className="text-3xl font-black text-white">{debtorCount}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] group">
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">Ticket Médio Débito</p>
          <p className="text-3xl font-black text-white">R$ {overdueOrders.length > 0 ? (totalInArrears / overdueOrders.length).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-2xl flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-zinc-500" size={20} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por cliente devedor..." 
            className="w-full bg-transparent border-none py-3.5 pl-12 pr-4 focus:ring-0 text-white placeholder-zinc-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-[3rem] p-20 text-center">
          <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
          <p className="text-zinc-500 font-black uppercase tracking-widest">Caixa em Dia!</p>
          <p className="text-zinc-600 text-sm mt-1">Não há faturas pendentes com mais de 7 dias.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(os => (
            <div key={os.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-zinc-700 transition-all">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center text-[#A32121] border border-zinc-800 font-black">
                  {getDaysInArrears(os.createdAt)}d
                </div>
                <div>
                  <h4 className="text-lg font-black text-white uppercase tracking-tight">{os.clientName}</h4>
                  <p className="text-xs font-black text-zinc-600 uppercase">OS #{os.osNumber} • {os.vehiclePlate}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-12">
                <div className="text-right">
                  <p className="text-xl font-black text-white">R$ {os.totalValue.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{os.paymentStatus}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedOrder(os)}
                    className="p-4 bg-[#25D366]/10 text-[#25D366] rounded-2xl hover:bg-[#25D366] hover:text-white transition-all"
                  >
                    <MessageCircle size={20} />
                  </button>
                  <button 
                    onClick={() => handleMarkAsPaid(os.id)}
                    className="p-4 bg-zinc-800 text-white rounded-2xl hover:bg-emerald-600 transition-all"
                  >
                    <CheckCircle2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Billing Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg p-10 rounded-[2.5rem] shadow-2xl relative">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-8 right-8 text-zinc-500 hover:text-white"><X size={28}/></button>
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">Cobrar {selectedOrder.clientName}</h3>
            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-10">Escolha o nível da notificação</p>
            
            <div className="grid grid-cols-3 gap-3 mb-8">
                {['mild', 'formal', 'final'].map((lvl: any) => (
                  <button 
                    key={lvl}
                    onClick={() => setBillingLevel(lvl)}
                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${billingLevel === lvl ? 'bg-white text-black border-white' : 'bg-zinc-950 text-zinc-500 border-zinc-800'}`}
                  >
                    {lvl === 'mild' ? 'Aviso' : lvl === 'formal' ? 'Cobrança' : 'Urgente'}
                  </button>
                ))}
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl mb-10 text-sm italic text-zinc-400 leading-relaxed">
                "{getBillingMessage(selectedOrder)}"
            </div>

            <button 
              onClick={() => sendWhatsApp(selectedOrder)}
              className="w-full bg-[#25D366] py-6 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-green-900/20"
            >
              <MessageCircle size={20} />
              Enviar para o WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
