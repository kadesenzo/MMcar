
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Phone, 
  MessageCircle, 
  Copy, 
  Car, 
  DollarSign, 
  Wrench, 
  History, 
  ExternalLink,
  Info,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  X,
  PlusCircle
} from 'lucide-react';
import { Client, Vehicle, ServiceOrder, UserSession } from '../types';

interface ClientDetailsProps {
  role: 'Dono' | 'Funcionário' | 'Recepção' | 'Gerente' | 'Mecânico' | 'Estoque' | string;
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ role, session, syncData }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [client, setClient] = useState<Client | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  // New Vehicle Form
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    model: '',
    brand: '',
    year: '',
    km: ''
  });

  const loadData = () => {
    if (session) {
      const savedClients = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_clients`) || '[]');
      const savedVehicles = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_vehicles`) || '[]');
      const savedOrders = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_orders`) || '[]');

      const foundClient = savedClients.find((c: Client) => c.id === id);
      if (foundClient) {
        setClient(foundClient);
        const clientVehicles = savedVehicles.filter((v: Vehicle) => v.clientId === foundClient.id);
        setVehicles(clientVehicles);
        const clientOrders = savedOrders.filter((o: ServiceOrder) => o.clientId === foundClient.id);
        setOrders(clientOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [id, session]);

  const handleAddVehicle = async () => {
    if (!newVehicle.plate || !client || !session || !syncData) return;

    const vehicle: Vehicle = {
      id: Math.random().toString(36).substr(2, 9),
      clientId: client.id,
      plate: newVehicle.plate.toUpperCase(),
      model: newVehicle.model,
      brand: newVehicle.brand,
      year: newVehicle.year,
      km: parseFloat(newVehicle.km) || 0
    };

    const allSavedVehicles = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_vehicles`) || '[]');
    const updatedVehicles = [...allSavedVehicles, vehicle];
    
    setVehicles([...vehicles, vehicle]);
    await syncData('vehicles', updatedVehicles);
    
    setShowVehicleModal(false);
    setNewVehicle({ plate: '', model: '', brand: '', year: '', km: '' });
  };

  const handleDeleteClient = async () => {
    if (role !== 'Dono' || !session || !syncData || !client) {
      alert("Acesso Negado: Apenas o Dono pode excluir clientes.");
      return;
    }

    const confirmMessage = `⚠️ ATENÇÃO: Tem certeza que deseja excluir o cliente ${client.name}?\n\nTODAS as notas (Ordens de Serviço) e TODOS os veículos vinculados a este cliente serão apagados PERMANENTEMENTE.\n\nEsta ação não pode ser desfeita.`;
    
    if (confirm(confirmMessage)) {
      const savedClients = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_clients`) || '[]');
      const updatedClients = savedClients.filter((c: Client) => c.id !== client.id);
      
      const savedVehicles = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_vehicles`) || '[]');
      const updatedVehicles = savedVehicles.filter((v: Vehicle) => v.clientId !== client.id);
      
      const savedOrders = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_orders`) || '[]');
      const updatedOrders = savedOrders.filter((o: ServiceOrder) => o.clientId !== client.id);

      await syncData('clients', updatedClients);
      await syncData('vehicles', updatedVehicles);
      await syncData('orders', updatedOrders);
      
      alert("Cliente e todos os dados vinculados removidos com sucesso.");
      navigate('/clients');
    }
  };

  if (!client) return null;

  const totalSpent = orders.reduce((acc, curr) => acc + curr.totalValue, 0);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado para a área de transferência!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      {/* Header & Contact Highlight */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <User size={200} />
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-[#A32121] rounded-3xl flex items-center justify-center text-white shadow-xl shadow-red-900/20">
              <User size={40} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                 <button onClick={() => navigate('/clients')} className="text-zinc-500 hover:text-white transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">{client.name}</h1>
              </div>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
                Membro desde {new Date(client.createdAt).toLocaleDateString('pt-BR')} • {client.document || 'Sem Documento'}
              </p>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl w-full md:w-auto min-w-[320px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Contato Prioritário</span>
              <div className="flex gap-2">
                 <button 
                  onClick={() => copyToClipboard(client.phone)}
                  className="p-2 bg-zinc-900 text-zinc-400 rounded-lg hover:text-white transition-all border border-zinc-800"
                  title="Copiar número"
                >
                  <Copy size={14} />
                </button>
                <a 
                  href={`https://wa.me/55${client.phone.replace(/\D/g,'')}`}
                  target="_blank"
                  className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366] hover:text-white transition-all border border-[#25D366]/20 flex items-center gap-2 px-4"
                >
                  <MessageCircle size={16} />
                  <span className="text-[10px] font-black uppercase">WhatsApp</span>
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#A32121]/10 text-[#A32121] rounded-2xl">
                <Phone size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{client.phone}</p>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Disponível para Cobranças e Avisos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-4 text-[#A32121]">
            <DollarSign size={20} />
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Financeiro Acumulado</span>
          </div>
          <p className="text-2xl font-black text-white">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">Total investido na oficina</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-4 text-blue-500">
            <Car size={20} />
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Frota Vinculada</span>
          </div>
          <p className="text-2xl font-black text-white">{vehicles.length} <span className="text-sm font-normal text-zinc-600 uppercase">Veículos</span></p>
          <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">Carros sob responsabilidade</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-4 text-amber-500">
            <History size={20} />
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Ordens de Serviço</span>
          </div>
          <p className="text-2xl font-black text-white">{orders.length} <span className="text-sm font-normal text-zinc-600 uppercase">Registros</span></p>
          <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">Total de passagens técnicas</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-4 text-emerald-500">
            <CreditCard size={20} />
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Score de Pagamento</span>
          </div>
          <p className="text-2xl font-black text-white">Excelente</p>
          <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">Fidelidade e pontualidade</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Vehicles Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white flex items-center gap-3">
              <Car size={20} className="text-[#A32121]" />
              Frota de {client.name.split(' ')[0]}
            </h3>
          </div>
          
          <div className="space-y-4">
            {vehicles.map(v => (
              <div 
                key={v.id} 
                onClick={() => navigate(`/vehicles/${v.id}`)}
                className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl hover:border-[#A32121]/50 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">
                    <span className="text-xs font-black text-white uppercase tracking-widest">{v.plate}</span>
                  </div>
                  <ChevronRight size={18} className="text-zinc-700 group-hover:text-white transition-colors" />
                </div>
                <h4 className="text-lg font-black text-white mb-1 uppercase tracking-tight italic">{v.model}</h4>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{v.brand} • {v.km.toLocaleString('pt-BR')} KM</p>
              </div>
            ))}
            {vehicles.length === 0 && (
              <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-3xl p-8 text-center text-zinc-600 text-sm italic">
                Nenhum veículo vinculado.
              </div>
            )}
            <button 
               onClick={() => setShowVehicleModal(true)}
               className="w-full bg-[#A32121]/10 border border-[#A32121]/20 text-[#A32121] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#A32121] hover:text-white transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-900/10"
            >
              <PlusCircle size={16} /> Adicionar Novo Veículo
            </button>
          </div>
        </div>

        {/* History Section */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white flex items-center gap-3">
              <History size={20} className="text-[#A32121]" />
              Histórico de Manutenções
            </h3>
          </div>

          <div className="space-y-4">
            {orders.map(os => (
              <div key={os.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between gap-6 hover:border-zinc-700 transition-all">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center text-[#A32121] border border-zinc-800 flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-black text-white uppercase tracking-tighter">Nota #{os.osNumber}</span>
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        {new Date(os.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-zinc-400 mb-2 uppercase italic">{os.vehicleModel} ({os.vehiclePlate})</p>
                    <p className="text-xs text-zinc-500 line-clamp-1 max-w-md italic">"{os.problem}"</p>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-center border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6">
                  <p className="text-xl font-black text-white">R$ {os.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <button 
                    onClick={() => navigate('/orders')}
                    className="text-[9px] font-black uppercase text-[#A32121] tracking-widest mt-2 flex items-center gap-1 hover:underline"
                  >
                    Ver Detalhes <ExternalLink size={10} />
                  </button>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-[2.5rem] p-16 text-center">
                <Wrench size={32} className="text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-600 font-bold">Nenhum serviço registrado para este cliente.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Internal Observations & Delete Profile Section */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex-1">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Info size={14} className="text-[#A32121]" /> 
            Prontuário Técnico e Observações Gerais
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed italic">
            {client.observations || "Nenhuma observação comportamental ou técnica registrada. Cliente prefere contato via WhatsApp para orçamentos rápidos."}
          </p>
        </div>
        
        {role === 'Dono' && (
          <button 
            onClick={handleDeleteClient}
            className="shrink-0 flex items-center gap-2 bg-zinc-950 border border-zinc-800 text-zinc-700 hover:text-red-500 hover:border-red-500/50 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Trash2 size={16} />
            Excluir Perfil Permanente
          </button>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg p-10 rounded-[3rem] shadow-2xl relative animate-in zoom-in">
              <button onClick={() => setShowVehicleModal(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white"><X size={28} /></button>
              
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-900/20">
                  <Car size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Novo Veículo</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Vincular a {client.name.split(' ')[0]}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Placa *</label>
                    <input 
                      type="text" 
                      value={newVehicle.plate}
                      onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value.toUpperCase()})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none font-bold placeholder-zinc-800"
                      placeholder="ABC-1D23"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Modelo *</label>
                    <input 
                      type="text" 
                      value={newVehicle.model}
                      onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none font-bold placeholder-zinc-800"
                      placeholder="Ex: Corolla XEI"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Marca</label>
                    <input 
                      type="text" 
                      value={newVehicle.brand}
                      onChange={(e) => setNewVehicle({...newVehicle, brand: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-white focus:border-blue-500 outline-none text-xs font-bold"
                      placeholder="Toyota"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Ano</label>
                    <input 
                      type="text" 
                      value={newVehicle.year}
                      onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-white focus:border-blue-500 outline-none text-xs font-bold"
                      placeholder="2022"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">KM Inicial</label>
                    <input 
                      type="number" 
                      value={newVehicle.km}
                      onChange={(e) => setNewVehicle({...newVehicle, km: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-white focus:border-blue-500 outline-none text-xs font-bold"
                      placeholder="0"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAddVehicle}
                  className="w-full bg-blue-600 py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-900/30 mt-4 active:scale-95 transition-transform"
                >
                  Confirmar Vínculo
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetails;
