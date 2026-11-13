import React, { useState, useEffect } from 'react';
import { 
  Repeat, Bell, MessageCircle, Calendar, CheckCircle2, Clock, 
  Send, Car, User, AlertTriangle, ShieldCheck, Search
} from 'lucide-react';
import { ServiceOrder, UserSession } from '../types';

interface AfterSalesProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

export const AfterSales: React.FC<AfterSalesProps> = ({ session, syncData }) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'LEMBRETES' | 'TODOS'>('LEMBRETES');

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

  const sendWhatsAppMessage = (phone: string, text: string) => {
    const clean = phone.replace(/\D/g, '');
    const url = clean.length >= 10 ? `https://wa.me/55${clean}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDay1Thanks = (os: ServiceOrder) => {
    const text = `Olá, *${os.clientName}*! Tudo bem? 👋\n\nAqui é da *Auto Mecânica KAEN*.\nPassando para agradecer pela confiança em nossa equipe e confirmar se a entrega do seu *${os.vehicleModel}* correu tudo 100% bem ontem!\n\nQualquer dúvida sobre os serviços ou peças instaladas, nossa equipe técnica está à sua total disposição.\n\n_Auto Mecânica Kaen • Excelência e Performance_`;
    sendWhatsAppMessage(os.clientPhone || '', text);
  };

  const handleDay30FollowUp = (os: ServiceOrder) => {
    const text = `Olá, *${os.clientName}*! Tudo bem? 👋\n\nAqui é da equipe técnica da *Auto Mecânica KAEN*.\nJá se passaram cerca de 30 dias desde o serviço realizado no seu *${os.vehicleModel}* (OS #${os.osNumber}).\n\nComo está o comportamento do carro? Freios, ruídos e funcionamento geral estão 100% macios e precisos?\n\nEstamos sempre à disposição para garantir que seu veículo continue em estado impecável!`;
    sendWhatsAppMessage(os.clientPhone || '', text);
  };

  const handleMaintenanceReminder = (os: ServiceOrder) => {
    const text = `🚨 *LEMBRETE PREVENTIVO KAEN* 🚗\n\nOlá, *${os.clientName}*!\nIdentificamos em nosso sistema que já se aproximam 6 meses (ou cerca de 10.000 KM) desde a última revisão do seu *${os.vehicleModel}* na Auto Mecânica KAEN.\n\nPara garantir sua segurança e preservar a durabilidade do motor e dos freios, sugerimos agendar uma revisão preventiva preventiva dos fluidos e pastilhas.\n\nGostaria de reservar um horário preferencial nesta semana?`;
    sendWhatsAppMessage(os.clientPhone || '', text);
  };

  // Vehicles with finished service orders
  const finishedOrders = orders.filter(os => {
    const isFinished = os.status === 'Entregue' || os.status === 'Finalizado' || os.status === 'Pronto';
    const matches = 
      os.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.vehiclePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.vehicleModel?.toLowerCase().includes(searchTerm.toLowerCase());
    return isFinished && matches;
  });

  return (
    <div className="w-full max-w-[1200px] space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-zinc-950/80 border border-white/5 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-widest">
            <Repeat size={16} />
            <span>Retenção de Clientes & Manutenção Preventiva</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1 italic">
            Pós-Venda & Lembretes de Revisão
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Transforme clientes de uma única visita em clientes recorrentes e fiéis da KAEN através de acompanhamento inteligente.
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-2xl text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Carros Atendidos</span>
            <span className="text-lg font-black text-white">{finishedOrders.length}</span>
          </div>
          <div className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 block">Lembretes Preventivos</span>
            <span className="text-lg font-black text-cyan-400">{Math.max(1, finishedOrders.length)}</span>
          </div>
        </div>
      </div>

      {/* Action Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="p-5 bg-zinc-950/70 border border-white/5 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase">
            <CheckCircle2 size={16} />
            <span>Dia 1: Agradecimento</span>
          </div>
          <p className="text-xs text-zinc-400">
            Confirmar que a entrega correu bem e deixar o cliente tranquilo com a garantia da oficina.
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-5 bg-zinc-950/70 border border-white/5 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase">
            <Clock size={16} />
            <span>Dia 30: Acompanhamento</span>
          </div>
          <p className="text-xs text-zinc-400">
            Perguntar como está o veículo no dia a dia, gerando autoridade e confiança duradoura.
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-5 bg-zinc-950/70 border border-white/5 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase">
            <Bell size={16} />
            <span>6 Meses: Revisão Preventiva</span>
          </div>
          <p className="text-xs text-zinc-400">
            Alertar sobre óleo, filtros, freios e alinhamento antes que quebre, trazendo o cliente de volta.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar histórico por placa, cliente ou veículo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-white/5 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
        />
      </div>

      {/* Client List */}
      <div className="space-y-3">
        {finishedOrders.length === 0 ? (
          <div className="p-12 text-center bg-zinc-950/40 border border-dashed border-white/10 rounded-3xl space-y-3">
            <Repeat size={32} className="mx-auto text-zinc-600" />
            <p className="text-sm font-bold text-zinc-400">Nenhum veículo entregue no momento</p>
            <p className="text-xs text-zinc-600">Conclua ordens de serviço para acionar as rotinas de pós-venda e retenção.</p>
          </div>
        ) : (
          finishedOrders.map(os => (
            <div
              key={os.id}
              className="p-5 bg-zinc-950/70 border border-white/5 hover:border-white/10 rounded-3xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all duration-300"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-[#FF2D55] bg-[#FF2D55]/10 px-2 py-0.5 rounded-lg">
                    {os.vehiclePlate}
                  </span>
                  <h3 className="text-sm font-black text-white uppercase">{os.clientName}</h3>
                  <span className="text-xs text-zinc-400">{os.vehicleModel}</span>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">OS #{os.osNumber}</span>
                </div>

                <p className="text-xs text-zinc-400">
                  Último serviço: <strong className="text-zinc-300">{os.problem || 'Revisão geral'}</strong> • Concluído em: {new Date(os.updatedAt || os.createdAt).toLocaleDateString('pt-BR')}
                </p>

                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                  <span>Tel: {os.clientPhone || 'Não cadastrado'}</span>
                  <span>•</span>
                  <span>Valor total gasto: R$ {os.totalValue.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons for WhatsApp Sequences */}
              <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                <button
                  onClick={() => handleDay1Thanks(os)}
                  className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                  title="Enviar mensagem de agradecimento da entrega"
                >
                  <MessageCircle size={13} />
                  <span>1. Agradecer Entrega</span>
                </button>

                <button
                  onClick={() => handleDay30FollowUp(os)}
                  className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                  title="Enviar acompanhamento de 30 dias"
                >
                  <Clock size={13} />
                  <span>2. Acompanhamento (30d)</span>
                </button>

                <button
                  onClick={() => handleMaintenanceReminder(os)}
                  className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                  title="Enviar lembrete de manutenção preventiva"
                >
                  <Bell size={13} />
                  <span>3. Lembrar Revisão</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AfterSales;
