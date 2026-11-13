import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Users, Plus, Search, Filter, Phone, MessageCircle, 
  Instagram, Globe, Share2, Target, ArrowRight, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { MarketingLead, UserSession } from '../types';

interface MarketingProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const INITIAL_LEADS: MarketingLead[] = [
  {
    id: 'lead-1',
    name: 'Marcos Vinícius',
    phone: '11998877665',
    vehicleModel: 'Honda Civic 2019',
    origin: 'Instagram',
    stage: 'Contato',
    estimatedValue: 1250,
    notes: 'Viu post de revisão de suspensão no Instagram da Kaen.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'lead-2',
    name: 'Dra. Juliana Prado',
    phone: '11977665544',
    vehicleModel: 'Jeep Compass 2021',
    origin: 'Google',
    stage: 'Orçamento',
    estimatedValue: 2400,
    notes: 'Pesquisou "mecânica de confiança em Registro" no Google Maps.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'lead-3',
    name: 'Roberto Andrade',
    phone: '11966554433',
    vehicleModel: 'Toyota Corolla 2017',
    origin: 'Indicação',
    stage: 'Serviço',
    estimatedValue: 1800,
    notes: 'Indicado pelo cliente Carlos que trocou embreagem mês passado.',
    createdAt: new Date().toISOString()
  }
];

const STAGES: MarketingLead['stage'][] = [
  'Lead',
  'Contato',
  'Orçamento',
  'Agendamento',
  'Serviço',
  'Cliente Recorrente'
];

export const Marketing: React.FC<MarketingProps> = ({ session, syncData }) => {
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [origin, setOrigin] = useState<MarketingLead['origin']>('Instagram');
  const [stage, setStage] = useState<MarketingLead['stage']>('Lead');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');

  const tenant = session?.username || 'rafael';

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem(`kaenpro_${tenant}_leads`) || localStorage.getItem('kaenpro_rafael_leads');
      if (saved) {
        try { setLeads(JSON.parse(saved)); } catch (e) { setLeads(INITIAL_LEADS); }
      } else {
        setLeads(INITIAL_LEADS);
        localStorage.setItem(`kaenpro_${tenant}_leads`, JSON.stringify(INITIAL_LEADS));
      }
    };

    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [tenant]);

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newLead: MarketingLead = {
      id: `lead-${Date.now()}`,
      name,
      phone,
      vehicleModel,
      origin,
      stage,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
      notes,
      createdAt: new Date().toISOString()
    };

    const updated = [newLead, ...leads];
    setLeads(updated);
    localStorage.setItem(`kaenpro_${tenant}_leads`, JSON.stringify(updated));
    localStorage.setItem(`kaenpro_rafael_leads`, JSON.stringify(updated));
    if (syncData) {
      await syncData('leads', updated);
    }
    window.dispatchEvent(new CustomEvent('kaen_storage_updated'));
    setShowModal(false);
    resetForm();
  };

  const handleAdvanceStage = async (leadId: string, currentStage: MarketingLead['stage']) => {
    const currentIdx = STAGES.indexOf(currentStage);
    if (currentIdx >= STAGES.length - 1) return;
    const nextStage = STAGES[currentIdx + 1];

    const updated = leads.map(l => l.id === leadId ? { ...l, stage: nextStage } : l);
    setLeads(updated);
    localStorage.setItem(`kaenpro_${tenant}_leads`, JSON.stringify(updated));
    localStorage.setItem(`kaenpro_rafael_leads`, JSON.stringify(updated));
    if (syncData) {
      await syncData('leads', updated);
    }
    window.dispatchEvent(new CustomEvent('kaen_storage_updated'));
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setVehicleModel('');
    setOrigin('Instagram');
    setStage('Lead');
    setEstimatedValue('');
    setNotes('');
  };

  const filtered = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.vehicleModel && l.vehicleModel.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesOrigin = originFilter === 'ALL' || l.origin === originFilter;
    return matchesSearch && matchesOrigin;
  });

  const getOriginBadge = (orig: MarketingLead['origin']) => {
    switch (orig) {
      case 'Instagram':
        return <span className="flex items-center gap-1 text-[9px] font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full"><Instagram size={10} /> Instagram</span>;
      case 'Google':
        return <span className="flex items-center gap-1 text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full"><Globe size={10} /> Google Maps</span>;
      case 'Indicação':
        return <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full"><Share2 size={10} /> Indicação</span>;
      default:
        return <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full"><Target size={10} /> {orig}</span>;
    }
  };

  return (
    <div className="w-full max-w-[1200px] space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-zinc-950/80 border border-white/5 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-pink-400 text-xs font-black uppercase tracking-widest">
            <Megaphone size={16} />
            <span>Captação de Clientes & Canais de Venda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1 italic">
            Marketing & Funil da KAEN
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Saiba exatamente de onde estão vindo seus clientes: Instagram, Google, Indicações e Anúncios.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-5 py-3.5 bg-[#FF2D55] hover:bg-[#ff1744] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#FF2D55]/30 transition-all duration-200 active:scale-95"
        >
          <Plus size={16} />
          <span>Cadastrar Novo Lead</span>
        </button>
      </div>

      {/* Visual Funnel */}
      <div className="p-6 bg-zinc-950/80 border border-white/5 rounded-3xl space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Funil de Atendimento da Oficina
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {STAGES.map((stg, i) => {
            const count = leads.filter(l => l.stage === stg).length;
            return (
              <div key={stg} className="p-3 bg-black/60 border border-white/5 rounded-2xl text-center space-y-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500 block">
                  Etapa {i + 1}
                </span>
                <p className="text-xs font-black text-white uppercase truncate">{stg}</p>
                <span className="text-lg font-black text-[#FF2D55] font-mono block">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar lead por nome ou veículo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-white/5 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-white/5 rounded-2xl w-full sm:w-auto overflow-x-auto">
          {['ALL', 'Instagram', 'Google', 'Indicação', 'Anúncios'].map(orig => (
            <button
              key={orig}
              onClick={() => setOriginFilter(orig)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all
                ${originFilter === orig ? 'bg-pink-500 text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              {orig === 'ALL' ? 'Todos Canais' : orig}
            </button>
          ))}
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {filtered.map(l => (
          <div
            key={l.id}
            className="p-5 bg-zinc-950/70 border border-white/5 hover:border-white/10 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300"
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white uppercase">{l.name}</h3>
                {getOriginBadge(l.origin)}
                <span className="text-xs font-mono text-zinc-400 font-bold bg-white/5 px-2 py-0.5 rounded-lg">
                  {l.vehicleModel || 'Veículo não informado'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{l.notes || 'Sem observações adicionais.'}</p>
              <span className="text-[10px] text-zinc-500 font-mono">Contato: {l.phone}</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
              <div className="text-left sm:text-right">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">Etapa Atual</span>
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  {l.stage}
                </span>
              </div>

              {l.stage !== 'Cliente Recorrente' && (
                <button
                  onClick={() => handleAdvanceStage(l.id, l.stage)}
                  className="px-3 py-2 bg-zinc-900 hover:bg-[#FF2D55] text-zinc-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95"
                >
                  <span>Avançar</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo Lead */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-[2.5rem] w-full max-w-lg p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white rounded-xl"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-pink-400">Marketing da Oficina</span>
              <h2 className="text-xl font-black uppercase italic text-white mt-0.5">Novo Lead / Contato</h2>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-3 text-xs">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Roberto Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 99887-7665"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Veículo de Interesse</label>
                  <input
                    type="text"
                    placeholder="Ex: Civic 2019"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Origem do Contato</label>
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value as any)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-bold"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Google">Google Maps / Busca</option>
                    <option value="Indicação">Indicação de Cliente</option>
                    <option value="Anúncios">Anúncios Patrocinados</option>
                    <option value="WhatsApp">WhatsApp Direto</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Etapa Inicial</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as any)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-bold"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Observações do Atendimento</label>
                <input
                  type="text"
                  placeholder="Ex: Cliente interessado em revisão de freios e suspensão"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl font-black uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#FF2D55] hover:bg-[#ff1744] text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-[#FF2D55]/30"
                >
                  Salvar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketing;
