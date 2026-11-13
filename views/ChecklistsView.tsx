import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck, CheckCircle2, Camera, Search, Plus,
  Car, Shield, Fuel, LogOut, X
} from 'lucide-react';
import { ServiceOrder, UserSession, OSStatus } from '../types';
import PatioCheckinModal from '../components/PatioCheckinModal';
import AntesEDepoisModal from '../components/AntesEDepoisModal';
import {
  PATIO_CHECKLIST_CATEGORIES, readWorkshopData, writeWorkshopData,
  createOSTimelineEvent
} from '../src/utils/workshopHelpers';

interface ChecklistsViewProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

export const ChecklistsView: React.FC<ChecklistsViewProps> = ({ session, syncData }) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [selectedPhotosOs, setSelectedPhotosOs] = useState<ServiceOrder | null>(null);
  const [exitModalOs, setExitModalOs] = useState<ServiceOrder | null>(null);
  const [exitForm, setExitForm] = useState({
    kmExit: '',
    deliveredTo: '',
    toolsChecked: true,
    interiorClean: true,
    exteriorClean: true,
    kmChecked: true,
    finalTestPassed: true,
    finalPhotosDone: true
  });

  const tenant = session?.username || 'rafael';

  const loadData = () => {
    setOrders(readWorkshopData<ServiceOrder[]>(tenant, 'orders', []));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [tenant]);

  const ordersWithChecklist = orders.filter((os) => {
    const term = searchTerm.toLowerCase();
    return (
      os.clientName?.toLowerCase().includes(term) ||
      os.vehiclePlate?.toLowerCase().includes(term) ||
      os.vehicleModel?.toLowerCase().includes(term) ||
      os.osNumber?.includes(term)
    );
  });

  const openExitChecklist = (os: ServiceOrder) => {
    setExitModalOs(os);
    setExitForm({
      kmExit: os.kmExit || os.vehicleKm || '',
      deliveredTo: os.deliveredTo || os.clientName,
      toolsChecked: os.checklist?.exitChecklist?.toolsChecked ?? true,
      interiorClean: os.checklist?.exitChecklist?.interiorClean ?? true,
      exteriorClean: os.checklist?.exitChecklist?.exteriorClean ?? true,
      kmChecked: os.checklist?.exitChecklist?.kmChecked ?? true,
      finalTestPassed: os.checklist?.exitChecklist?.finalTestPassed ?? true,
      finalPhotosDone: os.checklist?.exitChecklist?.finalPhotosDone ?? true
    });
  };

  const handleSaveExitChecklist = async () => {
    if (!exitModalOs) return;
    const now = new Date().toISOString();
    const tl = createOSTimelineEvent(
      'CHECKLIST DE SAÍDA & ENTREGA',
      `KM Saída: ${exitForm.kmExit || '---'} • Entregue para: ${exitForm.deliveredTo}`,
      session?.realUsername || 'Recepção',
      session?.role
    );
    const updated = orders.map((o) =>
      o.id === exitModalOs.id
        ? {
            ...o,
            kmExit: exitForm.kmExit,
            deliveredTo: exitForm.deliveredTo,
            deliveredAt: now,
            status: OSStatus.ENTREGUE,
            updatedAt: now,
            timeline: [tl, ...(o.timeline || [])],
            checklist: {
              ...(o.checklist || { fuelLevel: '1/2', damages: [], items: {}, observations: '' }),
              kmExit: exitForm.kmExit,
              exitChecklist: {
                toolsChecked: exitForm.toolsChecked,
                interiorClean: exitForm.interiorClean,
                exteriorClean: exitForm.exteriorClean,
                kmChecked: exitForm.kmChecked,
                finalTestPassed: exitForm.finalTestPassed,
                finalPhotosDone: exitForm.finalPhotosDone
              }
            }
          }
        : o
    );
    setOrders(updated);
    if (syncData) await syncData('orders', updated);
    else writeWorkshopData(tenant, 'orders', updated);
    setExitModalOs(null);
  };

  return (
    <div className="w-full max-w-[1200px] space-y-6 pb-24 animate-in fade-in duration-300 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-zinc-950/80 border border-white/10 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest">
            <ClipboardCheck size={16} />
            <span>Pátio & Recepção • 10 Categorias + Saída</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1 italic">
            Checklists Digitais de Entrada e Saída
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Lataria, para-choques, vidros, pneus, interior, painel, combustível, pertences, avarias e KM entrada/saída.
          </p>
        </div>

        <button
          onClick={() => setShowCheckinModal(true)}
          className="px-5 py-3.5 bg-[#FF2D55] hover:bg-[#ff1744] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
        >
          <Plus size={16} />
          <span>Novo Check-in (10 Itens)</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-950/80 border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Vistorias Registradas</span>
            <span className="text-xl font-black text-white tabular-nums">{orders.length}</span>
          </div>
          <Car size={20} className="text-zinc-400" />
        </div>

        <div className="p-4 bg-zinc-950/80 border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">Confirmados pelo Cliente</span>
            <span className="text-xl font-black text-emerald-400 tabular-nums">
              {orders.filter((o) => o.checklist?.clientConfirmed).length}
            </span>
          </div>
          <CheckCircle2 size={20} className="text-emerald-400" />
        </div>

        <div className="p-4 bg-zinc-950/80 border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-[#FF2D55] block">Com Fotos Anexadas</span>
            <span className="text-xl font-black text-white tabular-nums">
              {orders.filter((o) => (o.proofPhotos?.length || 0) > 0 || (o.checklist?.proofPhotos?.length || 0) > 0).length}
            </span>
          </div>
          <Shield size={20} className="text-[#FF2D55]" />
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar checklist por placa, cliente ou modelo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-white/10 rounded-2xl text-xs text-white placeholder-zinc-500 outline-none focus:border-[#FF2D55]"
        />
      </div>

      <div className="space-y-4">
        {ordersWithChecklist.length === 0 ? (
          <div className="p-12 text-center bg-zinc-950/40 border border-dashed border-white/10 rounded-3xl space-y-2">
            <ClipboardCheck size={32} className="mx-auto text-zinc-600" />
            <p className="text-sm font-bold text-zinc-400">Nenhum checklist encontrado</p>
          </div>
        ) : (
          ordersWithChecklist.map((os) => {
            const checklist = os.checklist;
            const photoCount =
              (os.proofPhotos?.length || 0) + (checklist?.proofPhotos?.length || 0) + (checklist?.photos?.length || 0);
            const cats = checklist?.categories;

            return (
              <div key={os.id} className="p-5 bg-zinc-950/80 border border-white/10 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[#FF2D55] bg-[#FF2D55]/10 px-2.5 py-1 rounded-xl">
                      {os.vehiclePlate}
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase">{os.vehicleModel}</h3>
                      <p className="text-[10px] text-zinc-400">
                        Cliente: <strong className="text-zinc-200">{os.clientName}</strong> • OS #{os.osNumber} •{' '}
                        {os.boxNumber || 'Pátio'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSelectedPhotosOs(os)}
                      className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera size={14} className="text-[#FF2D55]" />
                      <span>Fotos ({photoCount})</span>
                    </button>
                    <button
                      onClick={() => openExitChecklist(os)}
                      className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Checklist Saída / Entrega</span>
                    </button>
                  </div>
                </div>

                {/* 10-Category Badges or Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PATIO_CHECKLIST_CATEGORIES.map((cat) => {
                    const ev = cats?.[cat.key];
                    const status = ev?.status || 'OK';
                    return (
                      <div key={cat.key} className="p-2.5 rounded-xl bg-black/50 border border-white/5 text-[10px]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-zinc-300 truncate">{cat.label}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                              status === 'OK'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : status === 'ATENCAO'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        {ev?.notes && <p className="text-[9px] text-zinc-500 truncate mt-1">{ev.notes}</p>}
                      </div>
                    );
                  })}
                </div>

                {/* KM & Confirmation Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-zinc-400">
                  <div className="flex flex-wrap items-center gap-4 font-mono">
                    <span>
                      <Fuel size={12} className="inline text-amber-400 mr-1" />
                      Combustível: <strong className="text-white">{checklist?.fuelLevel || '1/2'}</strong>
                    </span>
                    <span>
                      KM Entrada: <strong className="text-white">{os.vehicleKm || '0'} km</strong>
                    </span>
                    <span>
                      KM Saída: <strong className="text-emerald-400">{os.kmExit || checklist?.kmExit || 'Em aberto'}</strong>
                    </span>
                  </div>
                  <span className={checklist?.clientConfirmed ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {checklist?.clientConfirmed
                      ? `✓ Confirmado por ${checklist.clientConfirmedBy || os.clientName}`
                      : 'Aguardando confirmação do cliente'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showCheckinModal && (
        <PatioCheckinModal
          isOpen={showCheckinModal}
          onClose={() => setShowCheckinModal(false)}
          session={session}
          syncData={syncData}
        />
      )}

      {selectedPhotosOs && (
        <AntesEDepoisModal
          isOpen={!!selectedPhotosOs}
          onClose={() => setSelectedPhotosOs(null)}
          os={selectedPhotosOs}
          session={session}
          syncData={syncData}
        />
      )}

      {/* MODAL CHECKLIST DE SAÍDA & KM DE SAÍDA */}
      {exitModalOs && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-6 space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">ENTREGA DO VEÍCULO</span>
                <h3 className="text-lg font-black uppercase italic text-white">
                  OS #{exitModalOs.osNumber} • {exitModalOs.vehiclePlate}
                </h3>
              </div>
              <button onClick={() => setExitModalOs(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">KM de Entrada</label>
                <input disabled value={exitModalOs.vehicleKm || '0'} className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-zinc-400" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-emerald-400 block mb-1">KM de Saída *</label>
                <input
                  type="text"
                  value={exitForm.kmExit}
                  onChange={(e) => setExitForm((prev) => ({ ...prev, kmExit: e.target.value }))}
                  className="w-full bg-black border border-emerald-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">Entregue Para (Nome)</label>
              <input
                type="text"
                value={exitForm.deliveredTo}
                onChange={(e) => setExitForm((prev) => ({ ...prev, deliveredTo: e.target.value }))}
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white"
              />
            </div>

            <div className="space-y-2">
              {[
                { key: 'toolsChecked', label: 'Ferramentas removidas e peças antigas mostradas' },
                { key: 'interiorClean', label: 'Interior protegido e limpo' },
                { key: 'exteriorClean', label: 'Lataria conferida sem novas avarias' },
                { key: 'finalTestPassed', label: 'Teste final e painel sem alertas' }
              ].map((item) => {
                const val = (exitForm as any)[item.key] as boolean;
                return (
                  <label key={item.key} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/60 border border-white/5 text-xs text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => setExitForm((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      className="accent-emerald-500"
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button onClick={() => setExitModalOs(null)} className="flex-1 py-3 rounded-xl bg-zinc-900 text-zinc-400 text-[10px] font-black uppercase cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleSaveExitChecklist} className="flex-1 py-3 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase cursor-pointer">
                Confirmar Saída & Entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistsView;
