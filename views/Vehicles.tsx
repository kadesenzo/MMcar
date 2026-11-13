
import React, { useState, useEffect } from 'react';
import { Car, Search, Trash2, User, Info, ChevronRight, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Vehicle, Client, ServiceOrder, UserSession } from '../types';

interface VehiclesProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const Vehicles: React.FC<{ session?: UserSession; syncData?: (key: string, data: any) => Promise<void> }> = ({ session, syncData }) => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    if (session) {
      const userVehicles = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_vehicles`) || '[]');
      const userClients = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_clients`) || '[]');
      const userOrders = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_orders`) || '[]');
      setVehicles(userVehicles);
      setClients(userClients);
      setOrders(userOrders);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [session]);

  const handleDelete = async (id: string) => {
    if (!session || !syncData) return;
    if (confirm("⚠️ DESEJA REALMENTE EXCLUIR ESTE VEÍCULO DA FROTA?")) {
      const updated = vehicles.filter(v => v.id !== id);
      setVehicles(updated);
      await syncData('vehicles', updated);
    }
  };

  const getOwner = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  const getServiceCount = (plate: string) => {
    return orders.filter(o => o.vehiclePlate === plate).length;
  };

  const filtered = vehicles.filter(v => 
    v.plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getOwner(v.clientId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-[1200px] p-6 md:p-8 flex flex-col items-center w-full mx-auto">
      <div className="flex flex-col items-center text-center gap-12 w-full mt-8">
        <h1 className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter leading-[0.8] text-center">
          FROTA <span className="text-[#FF2D55]">ATIVA</span>
        </h1>
      </div>

      <div className="w-full glass-card p-4 rounded-full flex items-center shadow-2xl border-white/10 max-w-4xl">
        <Search className="ml-8 text-zinc-700" size={24} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="PESQUISAR PLACA, CARRO OU PROPRIETÁRIO..." 
          className="w-full bg-transparent border-none py-6 px-8 text-white font-black text-xs outline-none uppercase tracking-[0.2em] placeholder-zinc-800"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-950/30 border-2 border-dashed border-zinc-900 rounded-[3rem] p-32 text-center w-full max-w-4xl">
          <Car size={48} className="mx-auto text-zinc-900 mb-6 opacity-20" />
          <p className="text-zinc-700 font-black uppercase tracking-[0.3em] text-xs italic">Nenhum veículo encontrado na base de dados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {filtered.map(v => {
            const owner = getOwner(v.clientId);
            const serviceCount = getServiceCount(v.plate);
            
            return (
              <div key={v.id} className="glass-card rounded-ios p-8 hover:border-[#FF2D55]/50 transition-all group relative overflow-hidden flex flex-col justify-between h-[450px]">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="bg-[#050505] px-6 py-2 rounded-2xl border border-zinc-800 group-hover:border-[#FF2D55]/50 transition-all shadow-inner">
                      <span className="text-lg font-black text-white uppercase tracking-[0.2em] italic">{v.plate}</span>
                    </div>
                    <div className="p-3 bg-zinc-900 text-zinc-700 rounded-2xl group-hover:text-[#FF2D55] transition-all">
                      <Car size={24} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight italic leading-none">{v.model}</h3>
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-2">{v.brand} {v.year ? `• ${v.year}` : ''}</p>
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <div className="flex items-center gap-4 text-zinc-500">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-[#FF2D55]">
                           <User size={18} />
                        </div>
                        <div>
                           <p className="text-[8px] font-black uppercase text-zinc-800 italic">PROPRIETÁRIO</p>
                           <p className="font-black uppercase tracking-widest text-[11px] text-zinc-300 truncate max-w-[150px]">{owner?.name || 'DESCONHECIDO'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-zinc-500">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-[#FF2D55]">
                           <Wrench size={18} />
                        </div>
                        <div>
                           <p className="text-[8px] font-black uppercase text-zinc-800 italic">SERVIÇOS KAEN</p>
                           <p className="font-black text-white text-[11px] uppercase">{serviceCount} PASSAGENS <span className="text-zinc-700">NA OFICINA</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                   <button 
                    onClick={() => handleDelete(v.id)}
                    className="p-5 bg-zinc-950 text-zinc-800 hover:text-[#FF2D55] rounded-2xl transition-all border border-zinc-900 active:scale-90"
                  >
                    <Trash2 size={24} />
                  </button>
                  <button 
                    onClick={() => navigate(`/vehicles/${v.id}`)}
                    className="flex-1 bg-white text-black font-black text-[10px] uppercase tracking-widest py-5 rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-xl italic active:scale-95"
                  >
                    PRONTUÁRIO COMPLETO
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Vehicles;
