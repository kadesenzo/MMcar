import React, { useState, useEffect } from 'react';
import { 
  Sparkles, MessageSquare, Copy, Check, Info,
  Send, User, AlertTriangle, HelpCircle, Phone, ArrowRight,
  Instagram, Video, Calendar, Shield, Award, Wrench, Car, Clock,
  Layers, CheckCircle2, ChevronRight, Share2, Flame, Eye
} from 'lucide-react';
import { Client, ServiceOrder, OSStatus } from '../types';

interface AiAssistantProps {
  session?: any;
  syncData?: any;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ session }) => {
  const [activeHubTab, setActiveHubTab] = useState<'CRM' | 'INSTAGRAM' | 'REELS' | 'STORIES' | 'ESTRUTURA'>('CRM');
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Client and Orders list
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);

  // CRM Custom State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [crmMessageType, setCrmMessageType] = useState<'welcome' | 'entry' | 'budget' | 'approved' | 'ready' | 'day1' | 'day7' | 'day30' | 'review6m' | 'custom'>('budget');
  const [customDetail, setCustomDetail] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [targetPhone, setTargetPhone] = useState<string>('');

  // Reels Generator State
  const [reelTopic, setReelTopic] = useState('Freios assobiando e pastilha gasta');
  const [reelVehicle, setReelVehicle] = useState('Honda Civic G10');
  const [loadingReel, setLoadingReel] = useState(false);
  const [reelScript, setReelScript] = useState<{
    hook: string;
    problem: string;
    diagnostic: string;
    solution: string;
    cta: string;
  } | null>(null);

  useEffect(() => {
    if (session) {
      const load = () => {
        const tenant = session.username;
        const localClients = JSON.parse(localStorage.getItem(`kaenpro_${tenant}_clients`) || '[]');
        const localOrders = JSON.parse(localStorage.getItem(`kaenpro_${tenant}_orders`) || '[]');
        setClients(localClients);
        setOrders(localOrders);
      };
      load();
      window.addEventListener('kaen_storage_updated', load);
      return () => window.removeEventListener('kaen_storage_updated', load);
    }
  }, [session]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Pre-configured templates based on MM Car Auto Center
  const buildTemplateMessage = (type: string, clientName: string, plate: string, value: number = 0) => {
    switch (type) {
      case 'welcome':
        return `🏎️ *MM CAR AUTO CENTER*
━━━━━━━━━━━━━━━━━━━━
Olá, *${clientName}*!
Seja muito bem-vindo(a) à *MM Car Auto Center*.

Seu cadastro foi realizado com sucesso em nosso sistema profissional. Aqui, você acompanha todo o processo do seu veículo com total transparência (fotos, checklist e laudo técnico).

📍 WhatsApp Oficial: (13) 99689-2958
🔧 _MM Car Auto Center • Excelência Automotiva_`;

      case 'entry':
        return `📋 *MM CAR AUTO CENTER — ENTRADA CONFIRMADA*
━━━━━━━━━━━━━━━━━━━━
Olá, *${clientName}*!
Confirmamos o recebimento do seu veículo:

🚗 *Veículo:* ${plate || 'Veículo em Atendimento'}
⏱️ *Status:* Aguardando Diagnóstico Técnico
📸 *Checklist & Fotos de Entrada:* Registrados no sistema

Nossa equipe técnica já está realizando a varredura com Scanner e inspeção minuciosa. Em breve enviaremos seu laudo completo com orçamento.

🔧 _MM Car Auto Center_`;

      case 'budget':
        return `💰 *MM CAR AUTO CENTER — LAUDO & ORÇAMENTO*
━━━━━━━━━━━━━━━━━━━━
Olá, *${clientName}*!
Finalizamos o diagnóstico técnico do seu veículo *${plate || ''}*.

📄 *DETALHAMENTO DOS SERVIÇOS & PEÇAS:*
• Inspeção de Injeção & Scanner Eletrônico
• Mão de obra especializada de reparo
• Peças de reposição padrão OEM

💵 *VALOR TOTAL:* R$ ${value > 0 ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}

Por gentileza, responda esta mensagem para validar:
[ ✅ *APROVAR SERVIÇO* ]
[ ❌ *NÃO APROVAR* ]

Dúvidas? Estamos à disposição.
🔧 _MM Car Auto Center_`;

      case 'approved':
        return `⚡ *MM CAR AUTO CENTER — SERVIÇO EM ANDAMENTO*
━━━━━━━━━━━━━━━━━━━━
Olá, *${clientName}*!
Seu orçamento foi *APROVADO* com sucesso!

🚗 *Veículo:* ${plate || ''}
👨‍🔧 *Status:* Em Execução no Box Técnico
🛠️ Peças requisitadas e mecânico responsável em ação.

Você receberá um novo aviso assim que o checklist de saída e teste de rodagem forem concluídos!

🔧 _MM Car Auto Center_`;

      case 'ready':
        return `✅ *MM CAR AUTO CENTER — VEÍCULO PRONTO!*
━━━━━━━━━━━━━━━━━━━━
Olá, *${clientName}*!
Temos ótimas notícias: o seu veículo *${plate || ''}* está *100% PRONTO* para retirada!

📋 *CHECKLIST FINAL CONCLUÍDO:*
✓ Reparo e substituição de peças finalizados
✓ Teste de rodagem e scanner zerado
✓ Interior e exterior higienizados
✓ Fotos finais de comprovação arquivadas

📍 Venha retirar seu carro na MM Car Auto Center!
Rua Joaquim Marques Alves, 765 - Registro/SP
Horário de Atendimento: Seg a Sex até 18h | Sáb até 12h.

🔧 _MM Car Auto Center_`;

      case 'day1':
        return `🤝 *MM CAR AUTO CENTER — PÓS-VENDA (1 DIA)*
━━━━━━━━━━━━━━━━━━━━
Olá, *${clientName}*! Tudo bem?
Passando para saber como foi o retorno com o *${plate || 'seu veículo'}* após a manutenção de ontem.

O carro está respondendo 100% como você esperava?
Qualquer dúvida ou ajuste, estamos à sua inteira disposição!

🔧 _MM Car Auto Center_`;

      case 'day7':
        return `🔍 *MM CAR AUTO CENTER — REVISÃO 7 DIAS*
━━━━━━━━━━━━━━━━━━━━
Olá, *${clientName}*!
Já faz uma semana que realizamos a manutenção do seu *${plate || 'veículo'}*.

Gostaríamos de confirmar se o funcionamento continua perfeito e suave. Sua segurança e satisfação são a nossa prioridade máxima.

🔧 _MM Car Auto Center_`;

      case 'day30':
        return `🛡️ *MM CAR AUTO CENTER — LEMBRETE PREVENTIVO 30 DIAS*
━━━━━━━━━━━━━━━━━━━━
Olá, *${clientName}*!
Completamos 30 dias desde o seu último serviço conosco.

Lembramos que manter a calibragem dos pneus, nível de água do arrefecimento e óleo em dia preserva a vida útil do seu motor.

Precisando de uma checagem rápida de rotina, basta nos avisar por aqui!

🔧 _MM Car Auto Center_`;

      case 'review6m':
        return `📅 *MM CAR AUTO CENTER — REVISÃO PERIÓDICA (6 MESES)*
━━━━━━━━━━━━━━━━━━━━
Olá, *${clientName}*!
De acordo com nosso histórico técnico, está na hora da sua *Revisão Preventiva Semestral* do veículo *${plate || ''}*.

Evite quebras inesperadas e gastos elevados:
• Troca de óleo e filtros
• Verificação de pastilhas de freio
• Diagnóstico completo via Scanner

Deseja que reservemos um horário prioritário na nossa agenda para esta semana?

🔧 _MM Car Auto Center_`;

      default:
        return '';
    }
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setTargetPhone(client.phone || '');
      const clientOrders = orders.filter(o => o.clientId === clientId);
      const latestOrder = clientOrders[0];
      const msg = buildTemplateMessage(crmMessageType, client.name, latestOrder ? latestOrder.vehiclePlate : '', latestOrder ? latestOrder.totalValue : 0);
      setGeneratedMessage(msg);
    }
  };

  const handleSelectMessageType = (type: any) => {
    setCrmMessageType(type);
    const client = clients.find(c => c.id === selectedClientId);
    const clientOrders = orders.filter(o => o.clientId === selectedClientId);
    const latestOrder = clientOrders[0];
    const msg = buildTemplateMessage(type, client ? client.name : 'Cliente Especial', latestOrder ? latestOrder.vehiclePlate : 'ABC-1234', latestOrder ? latestOrder.totalValue : 850);
    setGeneratedMessage(msg);
  };

  const handleGenerateAiMessage = async () => {
    const matchedClient = clients.find(c => c.id === selectedClientId);
    setLoading(true);
    try {
      const payload = {
        clientName: matchedClient?.name || 'Cliente Especial',
        clientPhone: targetPhone,
        messageType: crmMessageType,
        details: customDetail || 'Garantir clareza técnica e botão de ação rápida'
      };

      const response = await fetch('/api/gemini/crm-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok && data.message) {
        setGeneratedMessage(data.message);
      } else {
        // Fallback to built-in template
        const fallback = buildTemplateMessage(crmMessageType, matchedClient ? matchedClient.name : 'Cliente', 'VEÍCULO MM CAR', 650);
        setGeneratedMessage(fallback);
      }
    } catch (err) {
      const fallback = buildTemplateMessage(crmMessageType, matchedClient ? matchedClient.name : 'Cliente', 'VEÍCULO MM CAR', 650);
      setGeneratedMessage(fallback);
    } finally {
      setLoading(false);
    }
  };

  const buildFallbackReel = () => ({
    hook: `⚠️ "O cliente quase perdeu o motor por causa desse barulho que parecia bobo!"`,
    problem: `Chegou na MM Car Auto Center esse ${reelVehicle} com sintoma grave: ${reelTopic}. O dono achou que era só sujeira, mas ao desmontar olha o que encontramos...`,
    diagnostic: `Scanner técnico acusou falha de pressão e ao retirar a peça no elevador, comprovamos o desgaste crítico que poderia travar tudo.`,
    solution: `Substituímos pela peça original OEM nova, sangramos o sistema e fizemos o teste de rodagem com scanner em tempo real. Veja a diferença do antes e depois!`,
    cta: `Seu carro está fazendo algum barulho estranho? Não espere quebrar. Toque no link da bio e agende seu diagnóstico na MM Car Auto Center.`
  });

  const handleGenerateReel = async () => {
    setLoadingReel(true);
    try {
      const response = await fetch('/api/gemini/reels-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: `${reelVehicle}: ${reelTopic}`,
          tone: 'Alerta dinâmico, autoridade técnica e enérgico'
        })
      });
      const data = await response.json();
      if (response.ok && data.hook && Array.isArray(data.scenes) && data.scenes.length > 0) {
        const s0 = data.scenes[0];
        const s1 = data.scenes[1] || data.scenes[0];
        const s2 = data.scenes[2] || data.scenes[data.scenes.length - 1];
        setReelScript({
          hook: data.hook,
          problem: s0 ? `${s0.visual} — "${s0.narration}"` : buildFallbackReel().problem,
          diagnostic: s1 ? `${s1.visual} — "${s1.narration}"` : buildFallbackReel().diagnostic,
          solution: s2 ? `${s2.visual} — "${s2.narration}"` : buildFallbackReel().solution,
          cta: data.cta || buildFallbackReel().cta
        });
      } else {
        setReelScript(buildFallbackReel());
      }
    } catch {
      setReelScript(buildFallbackReel());
    } finally {
      setLoadingReel(false);
    }
  };

  const activePreviewMessage = generatedMessage || buildTemplateMessage('budget', 'Carlos Silva', 'ABC-1234', 850);

  return (
    <div className="w-full min-h-screen text-white p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-44 animate-in fade-in duration-500">
      
      {/* HEADER PRINCIPAL DO HUB */}
      <div className="glass-card p-8 md:p-12 rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl bg-zinc-950/60">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center space-x-5 text-left">
            <div className="w-14 h-14 bg-[#FF2D55] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF2D55]/30 border border-white/20">
              <Sparkles size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-[0.3em] bg-zinc-900 border border-white/10 text-[#FF2D55] px-3 py-1 rounded-full uppercase">
                  CRM & MARKETING MASTER
                </span>
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                  AUTOMAÇÃO KAEN
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase mt-1 leading-none text-white">
                CENTRAL DE VENDAS, CRM & <span className="text-[#FF2D55]">MARCA</span>
              </h1>
            </div>
          </div>
          <p className="text-[10px] leading-relaxed max-w-sm text-zinc-400 font-bold uppercase tracking-widest text-left md:text-right">
            Gestão de régua de pós-venda, automação de WhatsApp, roteirizador de Reels, grade de Instagram e padrão de marca.
          </p>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-white/5">
          <button
            onClick={() => setActiveHubTab('CRM')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeHubTab === 'CRM' ? 'bg-[#FF2D55] text-white shadow-lg shadow-[#FF2D55]/30 scale-105' : 'bg-black/40 text-zinc-400 hover:text-white border border-white/5'}`}
          >
            <MessageSquare size={16} /> 1. Automações WhatsApp & Pós-Venda
          </button>

          <button
            onClick={() => setActiveHubTab('INSTAGRAM')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeHubTab === 'INSTAGRAM' ? 'bg-[#FF2D55] text-white shadow-lg shadow-[#FF2D55]/30 scale-105' : 'bg-black/40 text-zinc-400 hover:text-white border border-white/5'}`}
          >
            <Instagram size={16} /> 2. Instagram & Grade Semanal
          </button>

          <button
            onClick={() => { setActiveHubTab('REELS'); if (!reelScript) handleGenerateReel(); }}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeHubTab === 'REELS' ? 'bg-[#FF2D55] text-white shadow-lg shadow-[#FF2D55]/30 scale-105' : 'bg-black/40 text-zinc-400 hover:text-white border border-white/5'}`}
          >
            <Video size={16} /> 3. Roteirizador de Reels
          </button>

          <button
            onClick={() => setActiveHubTab('STORIES')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeHubTab === 'STORIES' ? 'bg-[#FF2D55] text-white shadow-lg shadow-[#FF2D55]/30 scale-105' : 'bg-black/40 text-zinc-400 hover:text-white border border-white/5'}`}
          >
            <Flame size={16} /> 4. Sequência Diária de Stories (1 a 10)
          </button>

          <button
            onClick={() => setActiveHubTab('ESTRUTURA')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeHubTab === 'ESTRUTURA' ? 'bg-[#FF2D55] text-white shadow-lg shadow-[#FF2D55]/30 scale-105' : 'bg-black/40 text-zinc-400 hover:text-white border border-white/5'}`}
          >
            <Shield size={16} /> 5. Padrão Visual, Oficina & Uniformes
          </button>
        </div>
      </div>

      {/* TAB 1: CRM & WHATSAPP AUTOMATION */}
      {activeHubTab === 'CRM' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Controls */}
          <div className="lg:col-span-5 glass-card p-6 md:p-8 rounded-[3rem] border border-white/10 space-y-6 text-left bg-zinc-950/40">
            <div>
              <h3 className="text-xs font-black uppercase text-[#FF2D55] tracking-widest flex items-center gap-2">
                <MessageSquare size={14} /> Selecionar Mensagem de Atendimento
              </h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">
                Escolha uma etapa do atendimento para gerar a mensagem profissional formatada
              </p>
            </div>

            {/* Select Client */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">1. Selecionar Cliente</label>
              <select
                value={selectedClientId}
                onChange={(e) => handleSelectClient(e.target.value)}
                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#FF2D55] outline-none font-bold"
              >
                <option value="">-- SELECIONAR CLIENTE CADASTRADO --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id} className="bg-zinc-950 text-white">
                    {c.name.toUpperCase()} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone input override */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">WhatsApp do Destinatário</label>
              <input
                type="text"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#FF2D55] outline-none font-mono font-bold"
              />
            </div>

            {/* Step Selection Grid */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">2. Estágio da Comunicação</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'welcome', label: '👋 Boas-vindas', color: 'border-blue-500/30' },
                  { id: 'entry', label: '🚗 Carro Recebido', color: 'border-amber-500/30' },
                  { id: 'budget', label: '💰 Orçamento Oficial', color: 'border-purple-500/30' },
                  { id: 'approved', label: '⚡ Serviço Aprovado', color: 'border-yellow-500/30' },
                  { id: 'ready', label: '✅ Carro Pronto!', color: 'border-emerald-500/30' },
                  { id: 'day1', label: '🤝 Pós-Venda 1 Dia', color: 'border-cyan-500/30' },
                  { id: 'day7', label: '🔍 Pós-Venda 7 Dias', color: 'border-indigo-500/30' },
                  { id: 'day30', label: '🛡️ Pós-Venda 30 Dias', color: 'border-teal-500/30' },
                  { id: 'review6m', label: '📅 Revisão 6 Meses', color: 'border-orange-500/30' },
                  { id: 'custom', label: '✨ Personalizado IA', color: 'border-[#FF2D55]/30' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectMessageType(item.id)}
                    className={`p-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider text-left transition-all ${crmMessageType === item.id ? 'bg-[#FF2D55] text-white border-white' : 'bg-black/50 text-zinc-400 hover:text-white ' + item.color}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes / Prompt */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Observações ou Peças Trocadas (Opcional)</label>
              <textarea
                value={customDetail}
                onChange={(e) => setCustomDetail(e.target.value)}
                rows={2}
                placeholder="Ex: Troca de pastilhas dianteiras + fluido DOT4, valor R$ 480"
                className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#FF2D55] outline-none font-medium resize-none"
              />
            </div>

            <button
              onClick={handleGenerateAiMessage}
              disabled={loading}
              className="w-full bg-[#FF2D55] hover:bg-[#FF2D55]/90 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 italic"
            >
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Sparkles size={16} />}
              <span>{loading ? 'PROCESSANDO IA...' : 'APERFEIÇOAR COM IA'}</span>
            </button>
          </div>

          {/* Right Preview */}
          <div className="lg:col-span-7 glass-card p-6 md:p-8 rounded-[3rem] border border-white/10 flex flex-col justify-between space-y-6 text-left bg-zinc-950/30">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Eye size={14} className="text-[#FF2D55]"/> PREVIEW DA MENSAGEM (FORMATO WHATSAPP)
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black px-2.5 py-1 rounded-full uppercase">
                  LETRA ESTILO COBRANÇA
                </span>
              </div>

              <div className="mt-4">
                <pre className="bg-black/80 p-6 rounded-2xl border border-white/10 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-mono select-all font-medium tracking-wide">
                  {activePreviewMessage}
                </pre>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <button
                onClick={() => handleCopy(activePreviewMessage, 'crm')}
                className="w-full bg-zinc-900 hover:bg-zinc-800 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-white/10"
              >
                {copiedText === 'crm' ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
                <span>{copiedText === 'crm' ? 'Copiado com Sucesso!' : 'Copiar Texto'}</span>
              </button>

              {targetPhone ? (
                <a
                  href={`https://api.whatsapp.com/send?phone=${targetPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(activePreviewMessage)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20ba5a] py-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-black flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 transition-transform active:scale-95"
                >
                  <Send size={14} />
                  <span>Enviar no WhatsApp</span>
                </a>
              ) : (
                <button
                  disabled
                  className="w-full bg-zinc-800 text-zinc-500 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <AlertTriangle size={14} />
                  <span>Informe o Telefone</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INSTAGRAM & GRADE SEMANAL */}
      {activeHubTab === 'INSTAGRAM' && (
        <div className="space-y-8 text-left">
          
          {/* OS 4 PILARES DO INSTAGRAM KAEN */}
          <div className="glass-card p-8 rounded-[3rem] border border-white/10 bg-zinc-950/40">
            <h3 className="text-lg font-black italic uppercase tracking-tighter text-white mb-2">
              OS 4 PILARES DE CONTEÚDO DA KAEN
            </h3>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-6">
              Distribuição estratégica para posicionar a KAEN como a oficina mais confiável da região
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-black/60 p-6 rounded-2xl border border-blue-500/20">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-2xl font-black text-blue-400">40%</span>
                  <Award size={20} className="text-blue-400" />
                </div>
                <h4 className="text-sm font-black uppercase text-white">AUTORIDADE</h4>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                  Diagnósticos difíceis resolvidos, scanner em tempo real, explicação didática de problemas mecânicos que outras oficinas não acharam.
                </p>
              </div>

              <div className="bg-black/60 p-6 rounded-2xl border border-emerald-500/20">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-2xl font-black text-emerald-400">30%</span>
                  <CheckCircle2 size={20} className="text-emerald-400" />
                </div>
                <h4 className="text-sm font-black uppercase text-white">PROVA & RESULTADO</h4>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                  Antes vs Depois de peças desgastadas, testes de rodagem, entrega de carros revisados e depoimentos espontâneos de clientes.
                </p>
              </div>

              <div className="bg-black/60 p-6 rounded-2xl border border-[#FF2D55]/20">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-2xl font-black text-[#FF2D55]">20%</span>
                  <Wrench size={20} className="text-[#FF2D55]" />
                </div>
                <h4 className="text-sm font-black uppercase text-white">VENDA DIRETA</h4>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                  Chamadas para revisão preventiva de férias, troca de óleo programada, inspeção de freios e agendamento pelo WhatsApp.
                </p>
              </div>

              <div className="bg-black/60 p-6 rounded-2xl border border-purple-500/20">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-2xl font-black text-purple-400">10%</span>
                  <Shield size={20} className="text-purple-400" />
                </div>
                <h4 className="text-sm font-black uppercase text-white">MARCA & BASTIDORES</h4>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                  Limpeza e organização impecável dos boxes, café na recepção, uniformes alinhados e a rotina diária da equipe KAEN.
                </p>
              </div>
            </div>
          </div>

          {/* GRADE SEMANAL DE POSTAGENS */}
          <div className="glass-card p-8 rounded-[3rem] border border-white/10 bg-zinc-950/40">
            <h3 className="text-lg font-black italic uppercase tracking-tighter text-white mb-2">
              GRADE SEMANAL DE PUBLICAÇÕES (SEG A SÁB)
            </h3>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-6">
              Cronograma comprovado para atrair donos de veículos qualificados
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { day: 'SEGUNDA-FEIRA', title: 'Carro da Semana (Reels)', desc: 'Carro que chegou guinchado ou com defeito crônico. Mostrar o diagnóstico no Scanner.', tag: 'Autoridade (40%)', color: 'border-blue-500/30' },
                { day: 'TERÇA-FEIRA', title: 'Antes vs Depois (Carrossel)', desc: 'Peça velha e desgastada x Peça nova OEM instalada no carro. Explicar o risco que o cliente corria.', tag: 'Prova (30%)', color: 'border-emerald-500/30' },
                { day: 'QUARTA-FEIRA', title: 'Mito ou Verdade Automotivo', desc: '"Pode completar a água do radiador da torneira?" / "Óleo sintético dura 10 mil km mesmo?".', tag: 'Autoridade (40%)', color: 'border-blue-500/30' },
                { day: 'QUINTA-FEIRA', title: 'Checklist de Segurança (Carrossel)', desc: '5 itens que você precisa verificar antes de pegar estrada no fim de semana.', tag: 'Venda (20%)', color: 'border-[#FF2D55]/30' },
                { day: 'SEXTA-FEIRA', title: 'Veículos Entregues da Semana', desc: 'Foto de 3 a 5 carros prontos alinhados na oficina limpa. Frase: "Mais uma semana de missão cumprida!".', tag: 'Marca (10%)', color: 'border-purple-500/30' },
                { day: 'SÁBADO', title: 'Plantão de Revisão & Agendamento', desc: 'Stories e post rápido: "Abrimos a agenda da próxima semana. Toque no link da bio para garantir sua vaga".', tag: 'Venda (20%)', color: 'border-[#FF2D55]/30' },
              ].map(card => (
                <div key={card.day} className={`bg-black/60 p-6 rounded-2xl border ${card.color} flex flex-col justify-between`}>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{card.day}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-300">{card.tag}</span>
                    </div>
                    <h4 className="text-base font-black text-white italic uppercase">{card.title}</h4>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{card.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase">
                    <span>Horário Ideal: 11h30 ou 18h30</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROTEIRIZADOR DE REELS */}
      {activeHubTab === 'REELS' && (
        <div className="space-y-8 text-left">
          <div className="glass-card p-8 rounded-[3rem] border border-white/10 bg-zinc-950/40">
            <h3 className="text-lg font-black italic uppercase tracking-tighter text-white mb-2">
              ESTRUTURA DE ALTA RETENÇÃO PARA REELS (5 ETAPAS)
            </h3>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-6">
              [ 1. Gancho ➔ 2. Problema ➔ 3. Diagnóstico ➔ 4. Solução ➔ 5. Chamada para Ação ]
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Controls */}
              <div className="lg:col-span-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Modelo do Veículo em Atendimento</label>
                  <input
                    type="text"
                    value={reelVehicle}
                    onChange={(e) => setReelVehicle(e.target.value)}
                    placeholder="Ex: Jeep Compass / Honda Civic / VW Golf"
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#FF2D55] outline-none font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Problema / Sintoma Identificado</label>
                  <input
                    type="text"
                    value={reelTopic}
                    onChange={(e) => setReelTopic(e.target.value)}
                    placeholder="Ex: Barulho na suspensão ao passar em lombada"
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#FF2D55] outline-none font-bold"
                  />
                </div>

                <button
                  onClick={handleGenerateReel}
                  disabled={loadingReel}
                  className="w-full bg-[#FF2D55] hover:bg-[#FF2D55]/90 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 italic disabled:opacity-60"
                >
                  {loadingReel ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Sparkles size={16} />}
                  <span>{loadingReel ? 'GERANDO ROTEIRO COM IA...' : 'GERAR ROTEIRO COMPLETO'}</span>
                </button>
              </div>

              {/* Script Outcome */}
              <div className="lg:col-span-7 space-y-3">
                {reelScript && (
                  <div className="space-y-3 bg-black/60 p-6 rounded-3xl border border-white/10">
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <span className="text-[9px] font-black text-[#FF2D55] uppercase tracking-widest">1. GANCHO VISUAL & AUDITIVO (0-3 SEGUNDOS)</span>
                      <p className="text-xs font-bold text-white mt-1">{reelScript.hook}</p>
                    </div>

                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">2. APRESENTAÇÃO DO PROBLEMA (3-10 SEGUNDOS)</span>
                      <p className="text-xs text-zinc-200 mt-1">{reelScript.problem}</p>
                    </div>

                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">3. DIAGNÓSTICO TÉCNICO KAEN (10-25 SEGUNDOS)</span>
                      <p className="text-xs text-zinc-200 mt-1">{reelScript.diagnostic}</p>
                    </div>

                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">4. SOLUÇÃO & EXECUÇÃO (25-45 SEGUNDOS)</span>
                      <p className="text-xs text-zinc-200 mt-1">{reelScript.solution}</p>
                    </div>

                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">5. CHAMADA PARA AÇÃO (CTA)</span>
                      <p className="text-xs font-bold text-white mt-1">{reelScript.cta}</p>
                    </div>

                    <button
                      onClick={() => handleCopy(`${reelScript.hook}\n\n${reelScript.problem}\n\n${reelScript.diagnostic}\n\n${reelScript.solution}\n\n${reelScript.cta}`, 'reel')}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-white/5 mt-2"
                    >
                      {copiedText === 'reel' ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
                      <span>{copiedText === 'reel' ? 'Roteiro Copiado!' : 'Copiar Roteiro'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SEQUÊNCIA DIÁRIA DE STORIES (1 A 10) */}
      {activeHubTab === 'STORIES' && (
        <div className="glass-card p-8 rounded-[3rem] border border-white/10 bg-zinc-950/40 text-left space-y-6">
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tighter text-white mb-2">
              SEQUÊNCIA DIÁRIA DE STORIES (STORY 1 AO 10)
            </h3>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              Gera conexão, engajamento e conversão de novos clientes todos os dias
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { num: '01', time: '08:00', title: 'Bom dia na oficina', desc: 'Portão da KAEN abrindo, ferramentas organizadas, café passado e boxes prontos. Frase motivacional ou foco do dia.' },
              { num: '02', time: '09:00', title: 'Primeiro carro do dia', desc: 'Foto do carro no elevador ou na rampa. "Olha a nave que acabou de entrar para diagnóstico técnico".' },
              { num: '03', time: '10:30', title: 'Defeito encontrado', desc: 'Foto aproximada ou vídeo de 15s mostrando o defeito (pastilha no osso, correia trincada, óleo preto).' },
              { num: '04', time: '11:45', title: 'Enquete interativa', desc: '"Você sabe de quantos em quantos km deve trocar esse componente? [ 10.000 km ] [ 50.000 km ]".' },
              { num: '05', time: '13:30', title: 'Peça nova chegando', desc: 'Caixa da peça original OEM sendo aberta na mesa técnica: "Peça com procedência garantida na KAEN".' },
              { num: '06', time: '14:45', title: 'Mecânico em ação', desc: 'Vídeo rápido de 10s da equipe montando ou torquímetro apertando no torque correto.' },
              { num: '07', time: '16:00', title: 'Antes vs Depois', desc: 'Montagem lado a lado: como a peça estava e como ficou instalada no carro.' },
              { num: '08', time: '17:00', title: 'Carro pronto e limpo', desc: 'Carro no pátio brilhando pronto para ser entregue ao proprietário com laudo KAEN.' },
              { num: '09', time: '18:00', title: 'Depoimento / Prova', desc: 'Print de mensagem de agradecimento do cliente no WhatsApp ou foto da entrega da chave.' },
              { num: '10', time: '19:00', title: 'Chamada final CTA', desc: '"Ainda temos 2 horários disponíveis para amanhã. Mande uma mensagem e garanta sua vaga!".' },
            ].map(story => (
              <div key={story.num} className="bg-black/60 p-5 rounded-2xl border border-white/5 flex gap-4 items-start">
                <div className="w-12 h-12 rounded-xl bg-[#FF2D55]/10 text-[#FF2D55] flex-shrink-0 flex flex-col items-center justify-center font-black border border-[#FF2D55]/20">
                  <span className="text-xs font-mono">{story.num}</span>
                  <span className="text-[8px] text-zinc-500 font-normal">{story.time}</span>
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-white italic">{story.title}</h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{story.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ESTRUTURA FÍSICA, UNIFORMES & PADRÃO KAEN */}
      {activeHubTab === 'ESTRUTURA' && (
        <div className="space-y-8 text-left">
          
          {/* ESTRUTURA FÍSICA DA OFICINA */}
          <div className="glass-card p-8 rounded-[3rem] border border-white/10 bg-zinc-950/40 space-y-6">
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-tighter text-white mb-2">
                1. ESTRUTURA DA OFICINA FÍSICA (PADRÃO PROFISSIONAL)
              </h3>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                Divisão espacial recomendada para transmitir autoridade e confiança imediata
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/60 p-6 rounded-2xl border border-white/10">
                <h4 className="text-sm font-black text-white uppercase italic">1. Recepção & Atendimento</h4>
                <ul className="text-xs text-zinc-400 mt-3 space-y-2">
                  <li>• Balcão com computador e tablet do sistema KAEN</li>
                  <li>• Sofá confortável e cadeiras para clientes</li>
                  <li>• TV com vídeos institucionais e provas de serviços</li>
                  <li>• Água, café expresso e expositor de aditivos/produtos</li>
                </ul>
              </div>

              <div className="bg-black/60 p-6 rounded-2xl border border-white/10">
                <h4 className="text-sm font-black text-white uppercase italic">2. Área de Diagnóstico</h4>
                <ul className="text-xs text-zinc-400 mt-3 space-y-2">
                  <li>• Scanner automotivo de última geração</li>
                  <li>• Mesa técnica de desmontagem de precisão</li>
                  <li>• Painel de ferramentas de testes de injeção</li>
                  <li>• Terminal móvel para fotos de laudo</li>
                </ul>
              </div>

              <div className="bg-black/60 p-6 rounded-2xl border border-white/10">
                <h4 className="text-sm font-black text-white uppercase italic">3. Boxes de Serviço & Pátio</h4>
                <ul className="text-xs text-zinc-400 mt-3 space-y-2">
                  <li>• Elevadores automotivos com piso pintado epóxi</li>
                  <li>• Carrinho de ferramentas individual por mecânico</li>
                  <li>• Estoque organizado com identificação por SKU</li>
                  <li>• Área de lavagem e entrega final com iluminação</li>
                </ul>
              </div>
            </div>
          </div>

          {/* IDENTIDADE VISUAL & UNIFORMES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-8 rounded-[3rem] border border-white/10 bg-zinc-950/40 space-y-4">
              <h3 className="text-base font-black italic uppercase tracking-tighter text-white">
                PALETA DE CORES OFICIAL KAEN
              </h3>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-[#050505] border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-[#050505] border border-white/20 mb-2"></div>
                  <p className="text-xs font-black uppercase text-white">Preto Profundo</p>
                  <p className="text-[10px] font-mono text-zinc-500">#050505 / Fachada & Base</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FF2D55]/10 border border-[#FF2D55]/30">
                  <div className="w-8 h-8 rounded-full bg-[#FF2D55] mb-2 shadow-lg shadow-[#FF2D55]/40"></div>
                  <p className="text-xs font-black uppercase text-[#FF2D55]">Vermelho KAEN</p>
                  <p className="text-[10px] font-mono text-zinc-400">#FF2D55 / Acentos & Logo</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-white mb-2"></div>
                  <p className="text-xs font-black uppercase text-white">Branco Puro</p>
                  <p className="text-[10px] font-mono text-zinc-500">#FFFFFF / Tipografia</p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-800/40 border border-zinc-700">
                  <div className="w-8 h-8 rounded-full bg-zinc-500 mb-2"></div>
                  <p className="text-xs font-black uppercase text-zinc-300">Cinza Metálico</p>
                  <p className="text-[10px] font-mono text-zinc-500">#71717A / Detalhes</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 rounded-[3rem] border border-white/10 bg-zinc-950/40 space-y-4">
              <h3 className="text-base font-black italic uppercase tracking-tighter text-white">
                GUIA DE UNIFORMES & POSTURA
              </h3>
              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl bg-black/60 border border-white/5">
                  <p className="text-xs font-black uppercase text-white">🔧 Mecânicos & Técnicos</p>
                  <p className="text-[11px] text-zinc-400 mt-1">Camisa polo preta ou macacão com bordado KAEN vermelho + nome do mecânico bordado no peito + bota de bico de aço limpa.</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/60 border border-white/5">
                  <p className="text-xs font-black uppercase text-white">👔 Recepção & Gerência</p>
                  <p className="text-[11px] text-zinc-400 mt-1">Camisa polo preta alinhada com logo KAEN bordada em branco/vermelho + calça jeans escura ou sarja preta.</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs font-black uppercase text-emerald-400">⭐ O Diferencial KAEN</p>
                  <p className="text-[11px] text-zinc-300 mt-1">"Aqui o cliente nunca é pego de surpresa: todas as peças antigas ficam separadas para conferência e as fotos do processo vão para o celular dele."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssistant;
