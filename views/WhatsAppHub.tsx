import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, CheckCircle2, Car, User, Clock, 
  Wrench, Copy, Check, ExternalLink, Sparkles, Phone
} from 'lucide-react';
import { ServiceOrder, UserSession } from '../types';

interface WhatsAppHubProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

export const WhatsAppHub: React.FC<WhatsAppHubProps> = ({ session }) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [selectedOs, setSelectedOs] = useState<ServiceOrder | null>(null);
  const [customPhone, setCustomPhone] = useState('');
  const [customName, setCustomName] = useState('');
  const [templateType, setTemplateType] = useState<
    'AGENDAMENTO' | 'ORCAMENTO' | 'CARRO_PRONTO' | 'AGRADECIMENTO' | 'REVISAO'
  >('CARRO_PRONTO');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  const tenant = session?.username || 'rafael';

  useEffect(() => {
    const loadData = () => {
      const savedOrders = localStorage.getItem(`kaenpro_${tenant}_orders`) || localStorage.getItem('kaenpro_rafael_orders');
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          setOrders(parsed);
          if (parsed.length > 0 && !selectedOs) {
            setSelectedOs(parsed[0]);
            setCustomPhone(parsed[0].clientPhone || '');
            setCustomName(parsed[0].clientName || '');
          }
        } catch (e) {}
      }
    };

    loadData();
  }, [tenant]);

  // Generate message based on selected template & order
  useEffect(() => {
    const client = customName || (selectedOs ? selectedOs.clientName : 'Cliente');
    const vehicle = selectedOs ? `${selectedOs.vehicleModel} (${selectedOs.vehiclePlate})` : 'seu veículo';
    const osNum = selectedOs ? `#${selectedOs.osNumber}` : '';
    const total = selectedOs ? `R$ ${selectedOs.totalValue.toFixed(2)}` : '';

    let text = '';
    switch (templateType) {
      case 'AGENDAMENTO':
        text = `Olá, *${client}*! Tudo bem? 👋\n\nAqui é da *Auto Mecânica KAEN*.\nConfirmamos o agendamento de atendimento do seu *${vehicle}* em nossa oficina.\n\n📍 Endereço: Auto Mecânica KAEN - Registro/SP\nNossa equipe já está pronta para receber seu veículo!`;
        break;

      case 'ORCAMENTO':
        text = `Olá, *${client}*! 👋\n\nA equipe técnica da *Auto Mecânica KAEN* finalizou o diagnóstico do seu *${vehicle}* (OS ${osNum}).\n\nTotal orçado: *${total}* (com garantia de 90 dias em peças e mão de obra).\n\nPara visualizar o laudo técnico completo e autorizar o serviço, basta nos responder com *AUTORIZADO* por aqui!`;
        break;

      case 'CARRO_PRONTO':
        text = `🏁 *SEU VEÍCULO ESTÁ PRONTO!* 🚗💨\n\nOlá, *${client}*! Os serviços realizados no seu *${vehicle}* foram concluídos com sucesso pela equipe da *Auto Mecânica KAEN*.\n\nTodos os testes de pista e inspeção de saída foram aprovados. Você já pode retirar seu carro quando desejar!\n\nAgradecemos a confiança!`;
        break;

      case 'AGRADECIMENTO':
        text = `Olá, *${client}*! Tudo bem? Passando para agradecer pela confiança na equipe da *Auto Mecânica KAEN*.\n\nEsperamos que a entrega do seu *${vehicle}* tenha superado suas expectativas! Qualquer dúvida, estamos sempre à sua total disposição.`;
        break;

      case 'REVISAO':
        text = `🚨 *LEMBRETE PREVENTIVO KAEN* 🚗\n\nOlá, *${client}*! Passando para lembrar que já se aproxima o período de revisão preventiva de óleo, filtros e pastilhas do seu *${vehicle}*.\n\nPrevenir é sempre mais seguro e econômico do que remediar. Gostaria de agendar um horário nesta semana?`;
        break;
    }

    setMessageText(text);
  }, [templateType, selectedOs, customName, customPhone]);

  const handleSelectOs = (os: ServiceOrder) => {
    setSelectedOs(os);
    setCustomPhone(os.clientPhone || '');
    setCustomName(os.clientName || '');
  };

  const handleSend = () => {
    const cleanPhone = customPhone.replace(/\D/g, '');
    const url = cleanPhone.length >= 10 
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(messageText)}` 
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-[1200px] space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-zinc-950/80 border border-white/5 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest">
            <MessageSquare size={16} />
            <span>Central Oficial de Mensagens Operacionais</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1 italic">
            WhatsApp Hub da KAEN
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Comunicação humanizada e ágil: confirmação de agendamento, envio de orçamento, aviso de pronto e pós-venda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Orders selector & Recipient details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-zinc-950/70 border border-white/5 rounded-3xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
              1. Selecionar Veículo / Cliente
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {orders.map(os => (
                <button
                  key={os.id}
                  onClick={() => handleSelectOs(os)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between
                    ${selectedOs?.id === os.id ? 'bg-[#FF2D55]/10 border-[#FF2D55] text-white' : 'bg-black/40 border-white/5 text-zinc-400 hover:text-white'}`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase truncate text-white">{os.clientName}</p>
                    <span className="text-[10px] text-zinc-400">{os.vehicleModel} • {os.vehiclePlate}</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 font-bold">OS #{os.osNumber}</span>
                </button>
              ))}
            </div>

            {/* Custom inputs */}
            <div className="space-y-3 pt-3 border-t border-white/5 text-xs">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">
                  Nome do Destinatário
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">
                  Número de WhatsApp
                </label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="(13) 99689-2958"
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Templates & Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 bg-zinc-950/70 border border-white/5 rounded-3xl space-y-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
              2. Modelo de Mensagem Humanizada
            </h3>

            {/* Template Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'CARRO_PRONTO', label: '🏁 Carro Pronto' },
                { id: 'ORCAMENTO', label: '💰 Enviar Orçamento' },
                { id: 'AGENDAMENTO', label: '📅 Confirmar Agendamento' },
                { id: 'AGRADECIMENTO', label: '🙏 Agradecimento Entrega' },
                { id: 'REVISAO', label: '🚨 Lembrete Revisão' }
              ].map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => setTemplateType(tpl.id as any)}
                  className={`p-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border text-left
                    ${templateType === tpl.id ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/50 border-white/5 text-zinc-400 hover:text-white'}`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {/* Message Textarea */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">
                Texto da Mensagem (Você pode editar antes de enviar)
              </label>
              <textarea
                rows={8}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs text-white leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSend}
                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all duration-200 active:scale-95"
              >
                <Send size={16} />
                <span>Abrir e Enviar no WhatsApp</span>
              </button>

              <button
                onClick={handleCopy}
                className="px-5 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-2xl font-black uppercase text-xs transition-all flex items-center gap-1.5"
                title="Copiar texto"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppHub;
