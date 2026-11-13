
import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Phone, FileText, ChevronRight, X, User, MessageCircle, Copy, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Client, Vehicle, ServiceOrder, UserSession } from '../types';

interface ClientsProps {
  role: 'Dono' | 'Funcionário' | 'Recepção' | 'Gerente' | 'Mecânico' | 'Estoque' | string;
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const Clients: React.FC<ClientsProps> = ({ role, session, syncData }) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    document: '',
    observations: ''
  });
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    model: '',
    brand: '',
    year: '',
    km: ''
  });

  const loadData = () => {
    if (session) {
      const saved = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_clients`) || '[]');
      setClients(saved);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [session]);

  const handleSave = async () => {
    if (!newClient.name || !newClient.phone || !newVehicle.plate || !session || !syncData) {
      alert("ERRO: Nome, Telefone e Placa do Veículo são obrigatórios.");
      return;
    }
    
    const clientId = Math.random().toString(36).substr(2, 9);
    const client: Client = {
      ...newClient,
      id: clientId,
      createdAt: new Date().toISOString()
    };

    const vehicle: Vehicle = {
      id: Math.random().toString(36).substr(2, 9),
      clientId: clientId,
      plate: newVehicle.plate.toUpperCase(),
      model: newVehicle.model,
      brand: newVehicle.brand,
      year: newVehicle.year,
      km: parseFloat(newVehicle.km) || 0
    };

    const updatedClients = [...clients, client];
    const savedVehicles = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_vehicles`) || '[]');
    const updatedVehicles = [...savedVehicles, vehicle];

    setClients(updatedClients);
    await syncData('clients', updatedClients);
    await syncData('vehicles', updatedVehicles);
    
    setShowModal(false);
    setNewClient({ name: '', phone: '', document: '', observations: '' });
    setNewVehicle({ plate: '', model: '', brand: '', year: '', km: '' });
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (role !== 'Dono' || !session || !syncData) {
      alert("Acesso Negado: Apenas o Administrador pode excluir clientes.");
      return;
    }

    const confirmMessage = `⚠️ ATENÇÃO: Tem certeza que deseja excluir o cliente ${clientName}?\n\nTODAS as notas e veículos vinculados a este cliente serão apagados PERMANENTEMENTE.\n\nEsta ação não pode ser desfeita.`;
    
    if (confirm(confirmMessage)) {
      const updatedClients = clients.filter(c => c.id !== clientId);
      const savedVehicles = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_vehicles`) || '[]');
      const updatedVehicles = savedVehicles.filter((v: Vehicle) => v.clientId !== clientId);
      const savedOrders = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_orders`) || '[]');
      const updatedOrders = savedOrders.filter((o: ServiceOrder) => o.clientId !== clientId);

      await syncData('clients', updatedClients);
      await syncData('vehicles', updatedVehicles);
      await syncData('orders', updatedOrders);
      
      setClients(updatedClients);
    }
  };

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.document.includes(searchTerm) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Clientes</h1>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Base de dados sincronizada de <span className="text-white">{session?.username}</span></p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#FF2D55] px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center space-x-2 hover:bg-[#D11D40] transition-all shadow-xl shadow-red-900/20 active:scale-95"
        >
          <UserPlus size={18} />
          <span>Novo Registro</span>
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-2xl flex items-center shadow-lg">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-zinc-600" size={20} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, documento ou contato..." 
            className="w-full bg-transparent border-none py-3.5 pl-12 pr-4 focus:ring-0 text-white font-bold placeholder-zinc-800"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-[3rem] p-16 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-600">
            <User size={32} />
          </div>
          <p className="text-zinc-500 font-black uppercase tracking-widest">Nenhum cliente sincronizado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(c => (
            <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 hover:border-[#A32121]/50 transition-all group relative overflow-hidden shadow-xl">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:text-[#FF2D55] transition-all border border-zinc-800">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-white group-hover:text-zinc-100 uppercase tracking-tight text-lg italic">{c.name}</h3>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">{c.document || 'Sem Documento'}</p>
                  </div>
                </div>
                {role === 'Dono' && (
                  <button 
                    onClick={() => handleDeleteClient(c.id, c.name)}
                    className="p-3 text-zinc-800 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>

              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-3xl p-6 mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">WhatsApp Principal</span>
                  <a href={`https://wa.me/55${c.phone.replace(/\D/g,'')}`} target="_blank" className="text-[#25D366] hover:scale-125 transition-transform"><MessageCircle size={16} /></a>
                </div>
                <div className="text-xl font-black text-zinc-200">{c.phone}</div>
              </div>

              <button 
                onClick={() => navigate(`/clients/${c.id}`)}
                className="w-full bg-zinc-800 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FF2D55] transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                <FileText size={16} /> Ver Perfil Completo
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastro */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl p-10 rounded-[3rem] shadow-2xl relative animate-in zoom-in">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={28} /></button>
            <h2 className="text-2xl font-black mb-10 flex items-center gap-4 italic uppercase tracking-tighter">
              <UserPlus className="text-[#FF2D55]" size={32} />
              Novo Registro Cloud
            </h2>
            
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome Completo *</label>
                    <input 
                      type="text" 
                      value={newClient.name}
                      onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-[#FF2D55] outline-none font-bold placeholder-zinc-800"
                      placeholder="NOME DO PROPRIETÁRIO"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">WhatsApp *</label>
                    <input 
                      type="text" 
                      value={newClient.phone}
                      onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-[#FF2D55] outline-none font-bold"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">CPF/CNPJ</label>
                    <input 
                      type="text" 
                      value={newClient.document}
                      onChange={(e) => setNewClient({...newClient, document: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-[#FF2D55] outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-8 bg-zinc-950/50 rounded-[2rem] border border-zinc-800">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF2D55]">Primeiro Veículo da Frota</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Placa *</label>
                    <input 
                      type="text" 
                      value={newVehicle.plate}
                      onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value.toUpperCase()})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-[#FF2D55] outline-none font-black tracking-widest"
                      placeholder="ABC-1234"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Modelo</label>
                    <input 
                      type="text" 
                      value={newVehicle.model}
                      onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-[#FF2D55] outline-none font-bold"
                      placeholder="Ex: Corolla"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full bg-[#FF2D55] py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-[#D11D40] transition-all shadow-2xl shadow-red-900/40 active:scale-[0.98]"
              >
                Efetivar e Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
