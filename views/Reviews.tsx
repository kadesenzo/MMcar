import React, { useState, useEffect } from 'react';
import { 
  Star, MessageCircle, Send, Users, CheckCircle2, Clock, 
  ExternalLink, Search, Plus, ThumbsUp, Heart, Sparkles, X
} from 'lucide-react';
import { CustomerReview, ServiceOrder, UserSession } from '../types';

interface ReviewsProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const INITIAL_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-1',
    clientName: 'Claudio Ferreira',
    clientPhone: '11987654321',
    vehicleModel: 'Toyota Corolla 2014',
    rating: 5,
    feedback: 'Excelente atendimento e transparência. Mandaram as fotos das peças trocadas na hora pelo WhatsApp e o carro ficou perfeito.',
    source: 'Google',
    date: new Date().toISOString(),
    status: 'Avaliado'
  },
  {
    id: 'rev-2',
    clientName: 'Mariana Souza',
    clientPhone: '11999887766',
    vehicleModel: 'Honda HR-V 2018',
    rating: 5,
    feedback: 'Oficina limpa, equipe pontual e preço justo. Com certeza voltarei para as próximas revisões.',
    source: 'WhatsApp',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'Avaliado'
  }
];

export const Reviews: React.FC<ReviewsProps> = ({ session, syncData }) => {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [source, setSource] = useState<CustomerReview['source']>('Google');

  const tenant = session?.username || 'rafael';

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem(`kaenpro_${tenant}_reviews`) || localStorage.getItem('kaenpro_rafael_reviews');
      if (saved) {
        try { setReviews(JSON.parse(saved)); } catch (e) { setReviews(INITIAL_REVIEWS); }
      } else {
        setReviews(INITIAL_REVIEWS);
        localStorage.setItem(`kaenpro_${tenant}_reviews`, JSON.stringify(INITIAL_REVIEWS));
      }

      const savedOrders = localStorage.getItem(`kaenpro_${tenant}_orders`) || localStorage.getItem('kaenpro_rafael_orders');
      if (savedOrders) {
        try { setOrders(JSON.parse(savedOrders)); } catch (e) {}
      }
    };

    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [tenant]);

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    const newRev: CustomerReview = {
      id: `rev-${Date.now()}`,
      clientName,
      clientPhone,
      vehicleModel,
      rating,
      feedback,
      source,
      date: new Date().toISOString(),
      status: 'Avaliado'
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    localStorage.setItem(`kaenpro_${tenant}_reviews`, JSON.stringify(updated));
    localStorage.setItem(`kaenpro_rafael_reviews`, JSON.stringify(updated));
    if (syncData) await syncData('reviews', updated);
    window.dispatchEvent(new CustomEvent('kaen_storage_updated'));
    setShowModal(false);
    resetForm();
  };

  const handleSendRequestWhatsApp = (client: { name: string; phone?: string; vehicle?: string }) => {
    const cleanPhone = (client.phone || '').replace(/\D/g, '');
    const text = `Olá, *${client.name}*! 👋\n\nAqui é da *Auto Mecânica KAEN*.\nEsperamos que seu *${client.vehicle || 'veículo'}* esteja com desempenho impecável após os serviços realizados!\n\nSua opinião é fundamental para nossa equipe. Poderia nos avaliar com 5 estrelas no Google? Leva menos de 30 segundos e nos ajuda muito:\n⭐⭐⭐⭐⭐ https://g.page/r/kaen-auto/review\n\nMuito obrigado pela confiança!`;
    const url = cleanPhone.length >= 10 ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setVehicleModel('');
    setRating(5);
    setFeedback('');
    setSource('Google');
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  // Delivered cars awaiting review
  const deliveredOrders = orders.filter(os => os.status === 'Entregue' || os.status === 'Finalizado');

  return (
    <div className="w-full max-w-[1200px] space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-zinc-950/80 border border-white/5 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest">
            <Star size={16} />
            <span>Reputação & Google Meu Negócio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1 italic">
            Avaliações & Satisfação de Clientes
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Transforme clientes satisfeitos em promotores da KAEN com solicitações de avaliação pelo WhatsApp.
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
          <span>Registrar Avaliação</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-zinc-950/80 border border-white/5 rounded-3xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Nota Média</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-black text-amber-400">{averageRating}</span>
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} fill="currentColor" />)}
              </div>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Sparkles size={24} />
          </div>
        </div>

        <div className="p-5 bg-zinc-950/80 border border-white/5 rounded-3xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">Avaliações Coletadas</span>
            <span className="text-2xl font-black text-white mt-1 block">{reviews.length}</span>
            <span className="text-[10px] text-zinc-500">100% de satisfação registrada</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <ThumbsUp size={24} />
          </div>
        </div>

        <div className="p-5 bg-zinc-950/80 border border-white/5 rounded-3xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-[#FF2D55] block">Aguardando Avaliação</span>
            <span className="text-2xl font-black text-white mt-1 block">{deliveredOrders.length}</span>
            <span className="text-[10px] text-zinc-500">Clientes com veículos entregues</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FF2D55]/10 flex items-center justify-center text-[#FF2D55]">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Disparo Rápido de Solicitação de Avaliação */}
      {deliveredOrders.length > 0 && (
        <div className="p-6 bg-zinc-950/70 border border-white/5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <MessageCircle size={16} className="text-emerald-400" />
              <span>Pedir Avaliação para Clientes Recentes (WhatsApp)</span>
            </h3>
            <span className="text-[9px] font-bold text-zinc-500">Serviços Entregues</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {deliveredOrders.slice(0, 4).map(os => (
              <div key={os.id} className="p-3 bg-black/50 border border-white/5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-white">{os.clientName}</p>
                  <p className="text-[10px] text-zinc-400">{os.vehicleModel} • {os.vehiclePlate}</p>
                </div>
                <button
                  onClick={() => handleSendRequestWhatsApp({ name: os.clientName, phone: os.clientPhone, vehicle: os.vehicleModel })}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  <Send size={12} />
                  <span>Pedir 5 Estrelas</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Avaliações */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Depoimentos & Feedbacks Registrados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map(rev => (
            <div key={rev.id} className="p-5 bg-zinc-950/70 border border-white/5 rounded-3xl space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black uppercase text-white">{rev.clientName}</h4>
                  <p className="text-[10px] text-zinc-400">{rev.vehicleModel} • Fonte: {rev.source}</p>
                </div>
                <div className="flex text-amber-400">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} size={12} fill="currentColor" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-zinc-300 italic bg-black/40 p-3 rounded-xl border border-white/5">
                "{rev.feedback}"
              </p>
              <span className="text-[9px] text-zinc-500 font-mono block">
                {new Date(rev.date).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Nova Avaliação */}
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
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400">Google & WhatsApp</span>
              <h2 className="text-xl font-black uppercase italic text-white mt-0.5">Registrar Avaliação</h2>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-3 text-xs">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Mendes"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Veículo</label>
                  <input
                    type="text"
                    placeholder="Ex: Honda Civic 2018"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Canal de Avaliação</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-bold"
                  >
                    <option value="Google">Google Meu Negócio</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Presencial">Presencial na Oficina</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Nota (1 a 5 Estrelas)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1
                        ${rating >= n ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-black border-white/10 text-zinc-500'}`}
                    >
                      <Star size={14} fill={rating >= n ? 'currentColor' : 'none'} />
                      <span>{n}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Feedback / Comentário do Cliente</label>
                <textarea
                  rows={3}
                  required
                  placeholder="O que o cliente disse sobre o serviço, atendimento e transparência?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
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
                  Salvar Avaliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;
