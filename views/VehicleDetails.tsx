
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Car, 
  ChevronLeft, 
  User, 
  Calendar, 
  Info, 
  Clock, 
  Plus, 
  FileText, 
  Package, 
  Wrench, 
  DollarSign, 
  CheckCircle2,
  X,
  History,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { Vehicle, Client, ServiceOrder, OSStatus, PaymentStatus, OSItem, UserSession } from '../types';

const VehicleDetails: React.FC<{ session?: UserSession; syncData?: (key: string, data: any) => Promise<void> }> = ({ session, syncData }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [owner, setOwner] = useState<Client | null>(null);
  const [history, setHistory] = useState<ServiceOrder[]>([]);
  const [showAddService, setShowAddService] = useState(false);
  
  // New Quick Service Form State
  const [newService, setNewService] = useState({
    description: '',
    labor: 0,
    km: '',
    items: [] as OSItem[]
  });

  const loadData = () => {
    const tenant = session?.username || 'rafael';
    const savedVehicles = JSON.parse(localStorage.getItem(`kaenpro_${tenant}_vehicles`) || '[]');
    const savedClients = JSON.parse(localStorage.getItem(`kaenpro_${tenant}_clients`) || '[]');
    const savedOrders = JSON.parse(localStorage.getItem(`kaenpro_${tenant}_orders`) || '[]');

    const foundVehicle = savedVehicles.find((v: Vehicle) => v.id === id);
    if (foundVehicle) {
      setVehicle(foundVehicle);
      const foundOwner = savedClients.find((c: Client) => c.id === foundVehicle.clientId);
      setOwner(foundOwner || null);
      
      const vehicleHistory = savedOrders.filter((os: ServiceOrder) => os.vehiclePlate === foundVehicle.plate);
      setHistory(vehicleHistory.sort((a: ServiceOrder, b: ServiceOrder) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [id, session]);

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <Car size={48} className="mb-4 opacity-20" />
        <p className="font-bold">Veículo não encontrado.</p>
        <button onClick={() => navigate('/vehicles')} className="mt-4 text-[#A32121] hover:underline flex items-center gap-2">
          <ChevronLeft size={16} /> Voltar para Frota
        </button>
      </div>
    );
  }

  const totalSpent = history.reduce((acc, curr) => acc + curr.totalValue, 0);
  const lastVisit = history.length > 0 ? new Date(history[0].createdAt).toLocaleDateString('pt-BR') : 'Nenhuma';

  const handleAddQuickService = async () => {
    if (!newService.description) {
      alert("Informe a descrição do serviço.");
      return;
    }

    const parsedKm = parseFloat(newService.km);
    const hasValidKm = newService.km.trim() !== '' && !isNaN(parsedKm) && parsedKm >= 0;
    const finalKmStr = hasValidKm ? parsedKm.toString() : (vehicle.km !== undefined && vehicle.km !== null ? vehicle.km.toString() : '0');

    const newOs: ServiceOrder = {
      id: Math.random().toString(36).substr(2, 9),
      osNumber: (Math.floor(Math.random() * 90000) + 10000).toString(),
      clientId: owner?.id || '',
      clientName: owner?.name || 'Cliente Desconhecido',
      clientPhone: owner?.phone,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate,
      vehicleModel: vehicle.model,
      vehicleKm: finalKmStr,
      problem: newService.description,
      items: [],
      laborValue: newService.labor,
      discount: 0,
      totalValue: newService.labor,
      status: OSStatus.FINALIZADO,
      paymentStatus: PaymentStatus.PENDENTE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedHistory = [newOs, ...history];
    setHistory(updatedHistory);
    
    // Update Global State
    const tenant = session?.username || 'rafael';
    const savedOrders = JSON.parse(localStorage.getItem(`kaenpro_${tenant}_orders`) || '[]');
    const nextOrders = [...savedOrders, newOs];
    
    if (syncData) {
      await syncData('orders', nextOrders);
    } else {
      localStorage.setItem(`kaenpro_${tenant}_orders`, JSON.stringify(nextOrders));
    }
    
    // Update Vehicle KM when applicable (new KM >= current KM or current KM is 0/unset)
    if (hasValidKm && parsedKm > 0 && parsedKm !== vehicle.km && (parsedKm >= (vehicle.km || 0) || !vehicle.km)) {
      const savedVehicles = JSON.parse(localStorage.getItem(`kaenpro_${tenant}_vehicles`) || '[]');
      const updatedVehicles = savedVehicles.map((v: Vehicle) => 
        v.id === vehicle.id ? { ...v, km: parsedKm } : v
      );
      if (syncData) {
        await syncData('vehicles', updatedVehicles);
      } else {
        localStorage.setItem(`kaenpro_${tenant}_vehicles`, JSON.stringify(updatedVehicles));
      }
      setVehicle({ ...vehicle, km: parsedKm });
    }

    setShowAddService(false);
    setNewService({ description: '', labor: 0, km: '', items: [] });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-8">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-[#A32121] rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-red-900/20">
            <Car size={48} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-zinc-100 text-zinc-900 px-3 py-1 rounded-lg text-sm font-black uppercase tracking-widest shadow-lg">
                {vehicle.plate}
              </span>
              <button onClick={() => navigate('/vehicles')} className="text-zinc-500 hover:text-white transition-colors">
                <ChevronLeft size={20} />
              </button>
            </div>
            <h1 className="text-4xl font-black text-white leading-tight uppercase tracking-tighter">
              {vehicle.model}
            </h1>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mt-1">
              {vehicle.brand} • {vehicle.year || 'Ano N/A'} • <span className="text-[#A32121]">{vehicle.km.toLocaleString('pt-BR')} KM</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowAddService(true)}
            className="bg-[#A32121] px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center gap-3 hover:bg-[#8B1A1A] transition-all shadow-xl shadow-red-900/20"
          >
            <Plus size={20} />
            Lançar Serviço
          </button>
          <button 
            onClick={() => navigate('/orders/new')}
            className="bg-zinc-800 border border-zinc-700 px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center gap-3 hover:bg-zinc-700 transition-all"
          >
            <FileText size={20} />
            Nova O.S.
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] hover:border-[#A32121]/50 transition-all">
          <div className="flex justify-between items-center mb-4">
            <div className="p-3 bg-[#A32121]/10 text-[#A32121] rounded-2xl"><DollarSign size={20} /></div>
            <span className="text-[10px] font-black uppercase text-zinc-500">Histórico Total</span>
          </div>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Gasto no Veículo</p>
          <p className="text-2xl font-black text-white">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem]">
          <div className="flex justify-between items-center mb-4">
            <div className="p-3 bg-zinc-800 text-zinc-400 rounded-2xl"><Wrench size={20} /></div>
            <span className="text-[10px] font-black uppercase text-zinc-500">Consultas</span>
          </div>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Visitas à Oficina</p>
          <p className="text-2xl font-black text-white">{history.length}</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem]">
          <div className="flex justify-between items-center mb-4">
            <div className="p-3 bg-zinc-800 text-zinc-400 rounded-2xl"><Clock size={20} /></div>
            <span className="text-[10px] font-black uppercase text-zinc-500">Atividade</span>
          </div>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Última Manutenção</p>
          <p className="text-2xl font-black text-white">{lastVisit}</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem]">
          <div className="flex justify-between items-center mb-4">
            <div className="p-3 bg-[#25D366]/10 text-[#25D366] rounded-2xl"><User size={20} /></div>
            <span className="text-[10px] font-black uppercase text-zinc-500">Proprietário</span>
          </div>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Dono Cadastrado</p>
          <p className="text-sm font-black text-white truncate uppercase">{owner?.name || 'Não Vinculado'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main History Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-black text-white flex items-center gap-3">
              <History size={20} className="text-[#A32121]" />
              Timeline de Serviços
            </h3>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{history.length} Registros Encontrados</span>
          </div>

          {history.length === 0 ? (
            <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-[2.5rem] p-20 text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-zinc-700">
                <Wrench size={32} />
              </div>
              <p className="text-zinc-500 font-bold mb-2">Sem histórico disponível.</p>
              <p className="text-zinc-600 text-sm max-w-xs mx-auto italic">Toda manutenção realizada aqui aparecerá nesta linha do tempo para seu controle total.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((os) => (
                <div key={os.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 group hover:border-[#A32121]/30 transition-all shadow-sm flex gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center text-[#A32121] border border-zinc-800 mb-2">
                      <FileText size={18} />
                    </div>
                    <div className="w-px h-full bg-zinc-800"></div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-black text-white uppercase">OS #{os.osNumber}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${os.paymentStatus === PaymentStatus.PAGO ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                            {os.paymentStatus}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                          <Calendar size={12} /> {new Date(os.createdAt).toLocaleDateString('pt-BR')}
                          {os.vehicleKm && (
                            <span className="text-zinc-400">• {Number(os.vehicleKm).toLocaleString('pt-BR')} KM</span>
                          )}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-black text-white">R$ {os.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Valor Final do Serviço</p>
                      </div>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl mb-4">
                      <p className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-tighter">Detalhamento Técnico:</p>
                      <p className="text-sm text-zinc-200 font-medium leading-relaxed">{os.problem}</p>
                    </div>

                    {os.items.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {os.items.map((item, idx) => (
                          <div key={idx} className="bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-2">
                            {item.type === 'PART' ? <Package size={10} className="text-amber-500" /> : <Wrench size={10} className="text-blue-500" />}
                            <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[120px]">{item.description}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                      <div className="flex gap-4">
                         <div className="flex flex-col">
                           <span className="text-[8px] font-black text-zinc-600 uppercase">Mão de Obra</span>
                           <span className="text-xs font-bold text-zinc-400">R$ {os.laborValue.toLocaleString('pt-BR')}</span>
                         </div>
                         <div className="flex flex-col">
                           <span className="text-[8px] font-black text-zinc-600 uppercase">Peças Aplicadas</span>
                           <span className="text-xs font-bold text-zinc-400">R$ {(os.items.reduce((a,c)=>a+(c.quantity*c.unitPrice),0)).toLocaleString('pt-BR')}</span>
                         </div>
                      </div>
                      <button 
                        onClick={() => navigate('/orders')}
                        className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
                      >
                        Ver Nota Fiscal <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info & Insights Panel */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl">
             <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">
              <Info size={20} className="text-[#A32121]" />
              Perfil do Carro
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Informações Base</label>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <span className="text-zinc-500 font-bold">Ano Modelo</span>
                    <span className="text-white font-black">{vehicle.year || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <span className="text-zinc-500 font-bold">Quilometragem</span>
                    <span className="text-[#A32121] font-black">{vehicle.km.toLocaleString('pt-BR')} KM</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Observações da Oficina</label>
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs text-zinc-400 italic leading-relaxed">
                  {vehicle.observations || "Nenhuma observação técnica específica registrada para este veículo até o momento."}
                </div>
              </div>

              <div className="bg-[#A32121]/10 border border-[#A32121]/20 p-6 rounded-3xl">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp size={18} className="text-[#A32121]" />
                  <span className="text-xs font-black text-[#A32121] uppercase tracking-widest">Insight de Manutenção</span>
                </div>
                <p className="text-[10px] font-bold text-zinc-400 leading-relaxed uppercase">
                  Veículo saudável. Próxima revisão preventiva recomendada para daqui 5.000 KM ou 6 meses.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl">
             <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-6">Contatos Rápidos</h3>
             <div className="flex flex-col gap-3">
                <button 
                  onClick={() => window.open(`https://wa.me/55${owner?.phone.replace(/\D/g,'')}`, '_blank')}
                  className="w-full bg-[#25D366]/10 text-[#25D366] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#25D366] hover:text-white transition-all"
                >
                  Chamada WhatsApp
                </button>
                <button 
                  onClick={() => navigate('/orders/new')}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 hover:text-white transition-all"
                >
                  Solicitar Reboque
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Quick Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto no-scrollbar">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg p-10 rounded-[2.5rem] shadow-2xl relative my-8">
            <button onClick={() => setShowAddService(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors">
              <X size={28} />
            </button>
            
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 bg-[#A32121] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-900/20">
                <Wrench size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Novo Registro</h2>
                <p className="text-sm text-zinc-500 uppercase font-black tracking-widest">Histórico do Veículo</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-3 ml-1">O que foi feito? (Descrição)</label>
                <textarea 
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  placeholder="Ex: Troca de pastilhas de freio dianteiras e sangria do sistema..."
                  rows={4}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:ring-1 focus:ring-[#A32121] text-sm font-medium leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-3 ml-1">Mão de Obra (R$)</label>
                  <input 
                    type="number" 
                    value={newService.labor}
                    onChange={(e) => setNewService({ ...newService, labor: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:ring-1 focus:ring-[#A32121] text-sm font-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-3 ml-1">KM Atual (Obrigatório)</label>
                  <input 
                    type="number" 
                    value={newService.km}
                    onChange={(e) => setNewService({ ...newService, km: e.target.value })}
                    placeholder={vehicle.km.toString()}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:ring-1 focus:ring-[#A32121] text-sm font-black"
                  />
                </div>
              </div>

              <div className="bg-[#A32121]/5 border border-[#A32121]/10 p-6 rounded-3xl flex items-center justify-between">
                <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Total do Lançamento</span>
                <span className="text-3xl font-black text-white">R$ {newService.labor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <button 
                onClick={handleAddQuickService}
                className="w-full bg-[#A32121] py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-[#8B1A1A] transition-all transform active:scale-[0.98] shadow-2xl shadow-red-900/30 flex items-center justify-center gap-3"
              >
                <CheckCircle2 size={22} />
                Salvar no Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleDetails;
