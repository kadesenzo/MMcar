import React, { useState, useEffect } from 'react';
import { 
  Camera, Search, Filter, Calendar, Car, User, 
  Eye, CheckCircle2, AlertTriangle, ShieldCheck, Download, Trash2
} from 'lucide-react';
import { ServiceOrder, ProofPhoto, UserSession } from '../types';
import AntesEDepoisModal from '../components/AntesEDepoisModal';

interface GalleryProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

export const Gallery: React.FC<GalleryProps> = ({ session, syncData }) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BEFORE' | 'AFTER'>('ALL');
  const [selectedOs, setSelectedOs] = useState<ServiceOrder | null>(null);

  const tenant = session?.username || 'rafael';

  useEffect(() => {
    const loadData = () => {
      const savedOrders = localStorage.getItem(`kaenpro_${tenant}_orders`) || localStorage.getItem('kaenpro_rafael_orders');
      if (savedOrders) {
        try { setOrders(JSON.parse(savedOrders)); } catch (e) {}
      }
    };

    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [tenant]);

  // Aggregate all photos with vehicle and OS context
  const allPhotos: Array<{
    photo: ProofPhoto;
    os: ServiceOrder;
  }> = [];

  orders.forEach(os => {
    const list = os.proofPhotos || os.checklist?.proofPhotos || [];
    list.forEach(ph => {
      allPhotos.push({
        photo: ph,
        os
      });
    });
  });

  const filteredPhotos = allPhotos.filter(item => {
    const matchesSearch = 
      item.os.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.os.vehiclePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.os.vehicleModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.photo.label?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (typeFilter === 'BEFORE') {
      return item.photo.type === 'BEFORE' || item.photo.type === 'ENTRY' || item.photo.type === 'DAMAGE';
    }
    if (typeFilter === 'AFTER') {
      return item.photo.type === 'AFTER';
    }

    return true;
  });

  return (
    <div className="w-full max-w-[1200px] space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-zinc-950/80 border border-white/5 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-[#FF2D55] text-xs font-black uppercase tracking-widest">
            <Camera size={16} />
            <span>Registro Visual Técnico & Arquivo Fotográfico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1 italic">
            Central de Fotos & Laudos Visuais
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Galeria completa de todas as fotos de entrada (Antes) e peças/serviços finalizados (Depois) registradas na KAEN.
          </p>
        </div>

        {/* Quick counter */}
        <div className="px-5 py-2.5 bg-zinc-900 border border-white/5 rounded-2xl text-center">
          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Fotos Cadastradas</span>
          <span className="text-lg font-black text-white">{allPhotos.length}</span>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar fotos por placa, modelo, cliente ou legenda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-white/5 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF2D55] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-white/5 rounded-2xl w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'Todas as Fotos' },
            { id: 'BEFORE', label: '⚠️ Fotos do Antes' },
            { id: 'AFTER', label: '✅ Fotos do Depois' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap
                ${typeFilter === tab.id ? 'bg-[#FF2D55] text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="p-16 text-center bg-zinc-950/40 border border-dashed border-white/10 rounded-3xl space-y-3">
          <Camera size={36} className="mx-auto text-zinc-600" />
          <p className="text-sm font-bold text-zinc-400">Nenhuma foto encontrada</p>
          <p className="text-xs text-zinc-600">
            Abra qualquer Ordem de Serviço ou Terminal Mecânico para registrar as fotos reais de antes e depois.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((item, idx) => {
            const isAfter = item.photo.type === 'AFTER';

            return (
              <div
                key={item.photo.id || idx}
                className="group rounded-3xl overflow-hidden bg-zinc-950 border border-white/5 hover:border-white/20 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="aspect-video w-full bg-black overflow-hidden relative">
                  <img
                    src={item.photo.url}
                    alt={item.photo.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md backdrop-blur-md shadow-md ${
                      isAfter ? 'bg-emerald-500/80 text-black' : 'bg-amber-500/80 text-black'
                    }`}>
                      {isAfter ? 'DEPOIS' : 'ANTES'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-white tracking-tight line-clamp-1">
                      {item.photo.label || 'Registro Fotográfico'}
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {item.os.vehicleModel} • <strong className="text-[#FF2D55]">{item.os.vehiclePlate}</strong>
                    </p>
                    <p className="text-[9px] text-zinc-500">Cliente: {item.os.clientName}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[8px] font-mono text-zinc-500">
                      {new Date(item.photo.timestamp).toLocaleDateString('pt-BR')}
                    </span>
                    <button
                      onClick={() => setSelectedOs(item.os)}
                      className="text-[9px] font-black uppercase tracking-wider text-[#FF2D55] hover:underline"
                    >
                      Ver Laudo OS
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Antes e Depois Modal */}
      {selectedOs && (
        <AntesEDepoisModal
          isOpen={!!selectedOs}
          onClose={() => setSelectedOs(null)}
          os={selectedOs}
          session={session as any}
          syncData={syncData as any}
        />
      )}
    </div>
  );
};

export default Gallery;
