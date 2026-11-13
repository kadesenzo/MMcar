import React, { useState, useRef } from 'react';
import { 
  Printer, Download, Sparkles, MapPin, CheckCircle2, AlertTriangle, XCircle, 
  Car, Shield, Wrench, Clock, FileText, Phone, Camera, DollarSign, Package,
  Layers, ChevronRight, Eye, RefreshCw, Send, Check, Building2, Flame,
  Share2, ArrowUpRight, Palette, Shirt, Coffee, BarChart3, Instagram, Video
} from 'lucide-react';

interface ProjectDocumentProps {
  session?: any;
  syncData?: (key: string, data: any) => Promise<void>;
}

export const ProjectDocument: React.FC<ProjectDocumentProps> = ({ session }) => {
  const [brandName, setBrandName] = useState<'AUTO MECÂNICA KAEN'>('AUTO MECÂNICA KAEN');
  const [streetNumber, setStreetNumber] = useState<string>('765 (Confirmar)');
  const [activeTab, setActiveTab] = useState<'VISUAL' | 'PDF_PREVIEW'>('VISUAL');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-24 px-2 sm:px-4 text-zinc-100">
      
      {/* TOP CONTROLS BAR (Non-printable) */}
      <div className="print:hidden glass-card p-6 md:p-8 rounded-[2.5rem] border-white/10 bg-zinc-950/80 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#FF2D55] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF2D55]/30 flex-shrink-0 border border-white/20">
            <FileText className="text-white w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PROJETO EXECUTIVO OFICIAL
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">VERSÃO 2.0 • REGISTRO/SP</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white mt-1">
              Plano de Profissionalização & Crescimento • KAEN
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Documento completo com os 23 pilares de evolução, diretrizes de operação e identidade oficial.
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={handlePrint}
            className="px-6 py-3.5 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2.5 transition-all shadow-xl active:scale-95"
          >
            <Printer size={16} />
            <span>Imprimir / Gerar PDF</span>
          </button>
        </div>
      </div>

      {/* DOCUMENT SHEET (Styled for both Screen & Print) */}
      <div 
        ref={printRef}
        className="glass-card rounded-[2.5rem] border border-white/10 bg-zinc-950 p-6 md:p-14 space-y-12 shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black print:p-0 print:m-0"
      >
        {/* DOCUMENT COVER / HEADER */}
        <div className="border-b border-white/10 print:border-zinc-300 pb-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FF2D55] print:bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-xl italic shadow-md">
                K
              </div>
              <div>
                <span className="text-xs font-black tracking-[0.3em] text-[#FF2D55] print:text-red-600 uppercase block italic">
                  PROJETO ESTRATÉGICO
                </span>
                <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white print:text-black">
                  {brandName}
                </h2>
              </div>
            </div>
            <p className="text-sm text-zinc-400 print:text-zinc-700 font-medium">
              Plano de Profissionalização, Organização e Crescimento Estruturado
            </p>
          </div>

          <div className="p-4 bg-zinc-900/90 print:bg-zinc-100 rounded-2xl border border-white/5 print:border-zinc-300 text-right space-y-1 min-w-[240px]">
            <div className="flex items-center justify-end gap-1.5 text-zinc-400 print:text-zinc-700 text-xs">
              <MapPin size={14} className="text-[#FF2D55] print:text-red-600" />
              <span className="font-semibold">Rua Joaquim Marques Alves</span>
            </div>
            <p className="text-[11px] text-zinc-400 print:text-zinc-600">
              Registro – SP • <strong className="text-white print:text-black">Nº {streetNumber}</strong>
            </p>
            <p className="text-[9px] text-zinc-400 print:text-zinc-500 font-mono">
              Status: Validado e em Execução
            </p>
          </div>
        </div>

        {/* MISSION & OBJECTIVE */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-black print:from-zinc-100 print:to-zinc-50 border border-white/10 print:border-zinc-300 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#FF2D55] print:text-red-600" />
            <h3 className="text-sm font-black uppercase tracking-widest text-[#FF2D55] print:text-red-600 italic">
              OBJETIVO CENTRAL DO PROJETO
            </h3>
          </div>
          <p className="text-base md:text-lg text-zinc-200 print:text-zinc-800 leading-relaxed font-medium">
            Transformar a <strong>{brandName}</strong> em uma oficina reconhecida por <strong>qualidade, confiança, organização, transparência, tecnologia e excelente atendimento</strong>, começando com melhorias de baixo custo e evoluindo gradualmente.
          </p>
          <div className="pt-2 text-xs text-zinc-400 print:text-zinc-600 border-t border-white/5 print:border-zinc-200 flex items-center gap-2 italic">
            <span>💡 <strong>Diretriz:</strong> A ideia não é simplesmente deixar a oficina bonita, mas transformá-la em uma empresa automotiva profissional com experiência impecável do primeiro contato ao pós-venda.</span>
          </div>
        </div>

        {/* 23 SECTIONS GRID */}
        <div className="space-y-12">
          
          {/* SECTION 1: IDENTIDADE VISUAL */}
          <div className="space-y-4 print:break-inside-avoid">
            <div className="flex items-center gap-3 border-b border-white/10 print:border-zinc-300 pb-2">
              <span className="w-7 h-7 rounded-lg bg-[#FF2D55] print:bg-red-600 text-white font-black text-xs flex items-center justify-center">1</span>
              <h4 className="text-xl font-black uppercase tracking-tight text-white print:text-black flex items-center gap-2">
                <Palette size={20} className="text-[#FF2D55] print:text-red-600" />
                Identidade Visual & Cores Oficiais
              </h4>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300">
                <div className="w-full h-8 rounded-lg bg-black border border-white/20 mb-2"></div>
                <p className="text-xs font-black uppercase text-white print:text-black">Preto</p>
                <p className="text-[11px] text-zinc-400 print:text-zinc-600">Força, autoridade e sofisticação</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300">
                <div className="w-full h-8 rounded-lg bg-[#FF2D55] mb-2"></div>
                <p className="text-xs font-black uppercase text-white print:text-black">Vermelho (#FF2D55)</p>
                <p className="text-[11px] text-zinc-400 print:text-zinc-600">Energia, ação e desempenho</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300">
                <div className="w-full h-8 rounded-lg bg-white mb-2"></div>
                <p className="text-xs font-black uppercase text-white print:text-black">Branco</p>
                <p className="text-[11px] text-zinc-400 print:text-zinc-600">Clareza e profissionalismo</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300">
                <div className="w-full h-8 rounded-lg bg-zinc-500 mb-2"></div>
                <p className="text-xs font-black uppercase text-white print:text-black">Cinza / Metálico</p>
                <p className="text-[11px] text-zinc-400 print:text-zinc-600">Tecnologia e setor automotivo</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 print:text-zinc-600">
              <strong>Aplicação consistente em:</strong> Fachada, Uniformes, Recepção, Boxes, Site, Sistema, Instagram, WhatsApp, Cartões, Documentos, Orçamentos e Ordens de Serviço.
            </p>
          </div>

          {/* SECTION 2: FACHADA */}
          <div className="space-y-4 print:break-inside-avoid">
            <div className="flex items-center gap-3 border-b border-white/10 print:border-zinc-300 pb-2">
              <span className="w-7 h-7 rounded-lg bg-[#FF2D55] print:bg-red-600 text-white font-black text-xs flex items-center justify-center">2</span>
              <h4 className="text-xl font-black uppercase tracking-tight text-white print:text-black flex items-center gap-2">
                <Building2 size={20} className="text-[#FF2D55] print:text-red-600" />
                Fachada — Primeira Transformação
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-emerald-950/20 print:bg-emerald-50 border border-emerald-500/20 print:border-emerald-200 space-y-2">
                <p className="text-xs font-black uppercase text-emerald-400 print:text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> O QUE FAZER (PRIORIDADE)
                </p>
                <ul className="text-xs text-zinc-300 print:text-zinc-700 space-y-1.5 list-disc pl-4">
                  <li>Pintura preta / grafite de alto impacto</li>
                  <li>Detalhes e frisos em vermelho automotivo</li>
                  <li>Comunicação visual unificada e moderna</li>
                  <li>Logo grande da {brandName} com iluminação externa</li>
                  <li>Serviços principais bem destacados e organizados</li>
                  <li>WhatsApp visível para passantes e motoristas</li>
                  <li>Aproveitamento inteligente dos portões existentes</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-red-950/20 print:bg-red-50 border border-red-500/20 print:border-red-200 space-y-2">
                <p className="text-xs font-black uppercase text-red-400 print:text-red-700 flex items-center gap-1.5">
                  <XCircle size={14} /> O QUE NÃO FAZER AGORA
                </p>
                <ul className="text-xs text-zinc-300 print:text-zinc-700 space-y-1.5 list-disc pl-4">
                  <li>Não derrubar paredes ou estruturas</li>
                  <li>Não fazer reformas estruturais caras</li>
                  <li>Não trocar tudo de uma só vez</li>
                  <li>Não encher a fachada de poluição visual</li>
                  <li>Não usar vermelho em excesso (manter equilíbrio)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION 3 & 4: LIMPEZA, ORGANIZAÇÃO & BOXES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:break-inside-avoid">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 print:border-zinc-300 pb-2">
                <span className="w-7 h-7 rounded-lg bg-[#FF2D55] print:bg-red-600 text-white font-black text-xs flex items-center justify-center">3</span>
                <h4 className="text-lg font-black uppercase tracking-tight text-white print:text-black">
                  Limpeza e Organização
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 text-xs text-zinc-300 print:text-zinc-700 space-y-2">
                <p><strong>Área Externa:</strong> Calçada limpa, pneus organizados, lixo fora da visão do cliente, fachada sem excesso de objetos.</p>
                <p><strong>Área Interna (Regra dos 4 Lugares):</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Ferramenta → lugar definido</li>
                  <li>Peça → lugar definido</li>
                  <li>Carro → box definido</li>
                  <li>Resíduo de óleo/peças → descarte definido</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 print:border-zinc-300 pb-2">
                <span className="w-7 h-7 rounded-lg bg-[#FF2D55] print:bg-red-600 text-white font-black text-xs flex items-center justify-center">4</span>
                <h4 className="text-lg font-black uppercase tracking-tight text-white print:text-black">
                  Boxes e Área Mecânica
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 text-xs text-zinc-300 print:text-zinc-700 space-y-2">
                <p><strong>Estrutura Padronizada por Box:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Elevador revisado e limpo</li>
                  <li>Carrinho de ferramentas móvel</li>
                  <li>Bancada técnica com boa iluminação</li>
                  <li>Tomadas e pontos de ar organizados</li>
                  <li>Lixeira e bandejas coletoras de óleo</li>
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION 5 & 6: UNIFORMES & RECEPÇÃO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:break-inside-avoid">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 print:border-zinc-300 pb-2">
                <span className="w-7 h-7 rounded-lg bg-[#FF2D55] print:bg-red-600 text-white font-black text-xs flex items-center justify-center">5</span>
                <h4 className="text-lg font-black uppercase tracking-tight text-white print:text-black flex items-center gap-2">
                  <Shirt size={18} className="text-[#FF2D55] print:text-red-600" />
                  Uniformes Oficiais
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 text-xs text-zinc-300 print:text-zinc-700 space-y-2">
                <p><strong>Mecânicos:</strong> Preto com detalhes em vermelho, logo no peito, nome do mecânico e logo nas costas.</p>
                <p><strong>Recepção:</strong> Camisa polo preta/cinza com bordado oficial.</p>
                <p><strong>Gerência:</strong> Camisa polo executiva alinhada com a marca.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 print:border-zinc-300 pb-2">
                <span className="w-7 h-7 rounded-lg bg-[#FF2D55] print:bg-red-600 text-white font-black text-xs flex items-center justify-center">6</span>
                <h4 className="text-lg font-black uppercase tracking-tight text-white print:text-black flex items-center gap-2">
                  <Coffee size={18} className="text-[#FF2D55] print:text-red-600" />
                  Recepção & Experiência
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 text-xs text-zinc-300 print:text-zinc-700 space-y-2">
                <p><strong>Fase 1:</strong> Balcão limpo, computador, cadeiras confortáveis, água, café fresco, Wi-Fi liberado e logo na parede.</p>
                <p><strong>Fase Futura:</strong> TV com painel informativo, ar-condicionado e área de espera VIP.</p>
              </div>
            </div>
          </div>

          {/* SECTION 7, 8, 9, 10: SISTEMA, PORTAL, JORNADA & TRANSPARÊNCIA */}
          <div className="space-y-6 print:break-inside-avoid">
            <div className="flex items-center gap-3 border-b border-white/10 print:border-zinc-300 pb-2">
              <span className="w-7 h-7 rounded-lg bg-[#FF2D55] print:bg-red-600 text-white font-black text-xs flex items-center justify-center">7-10</span>
              <h4 className="text-xl font-black uppercase tracking-tight text-white print:text-black flex items-center gap-2">
                <Wrench size={20} className="text-[#FF2D55] print:text-red-600" />
                Sistema Digital, Portal do Cliente & Transparência
              </h4>
            </div>

            {/* JORNADA 9 PASSOS */}
            <div className="p-5 rounded-3xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-[#FF2D55] print:text-red-600">
                JORNADA DO CLIENTE EM 9 ETAPAS
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 text-center">
                {[
                  '1. Chegada', '2. Cadastro', '3. Checklist', '4. Diagnóstico',
                  '5. Orçamento', '6. Aprovação', '7. Serviço', '8. Checklist Final', '9. Pós-Venda'
                ].map((step, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-black/50 print:bg-white border border-white/5 print:border-zinc-300 text-[10px] font-bold">
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {/* TRANSPARÊNCIA COM FOTOS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300">
                <Camera className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
                <p className="text-xs font-black uppercase text-white print:text-black">1. Foto do Problema</p>
                <p className="text-[10px] text-zinc-400 print:text-zinc-600">Comprovação técnica da falha na peça</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300">
                <Camera className="w-6 h-6 text-blue-400 mx-auto mb-1.5" />
                <p className="text-xs font-black uppercase text-white print:text-black">2. Foto da Peça Nova</p>
                <p className="text-[10px] text-zinc-400 print:text-zinc-600">Evidência de procedência e garantia</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300">
                <Camera className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-xs font-black uppercase text-white print:text-black">3. Foto da Instalação</p>
                <p className="text-[10px] text-zinc-400 print:text-zinc-600">Montagem concluída no padrão de fábrica</p>
              </div>
            </div>
          </div>

          {/* SECTION 11, 12, 13, 14: ORÇAMENTO DIGITAL, CHECKLIST & WHATSAPP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:break-inside-avoid">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 print:border-zinc-300 pb-2">
                <span className="w-7 h-7 rounded-lg bg-[#FF2D55] print:bg-red-600 text-white font-black text-xs flex items-center justify-center">11-12</span>
                <h4 className="text-lg font-black uppercase tracking-tight text-white print:text-black">
                  Orçamento Digital & Checklist
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 text-xs text-zinc-300 print:text-zinc-700 space-y-2">
                <p><strong>Orçamento Transparente:</strong> Discriminação exata de peças e mão de obra com botões de <strong>[🟢 Aprovar]</strong>, <strong>[🔴 Recusar]</strong> e <strong>[💬 Tirar Dúvida]</strong>.</p>
                <p><strong>Checklist de Cores Semafóricas:</strong></p>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">🟢 OK</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">🟡 Atenção</span>
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">🔴 Problema / Trocar</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 print:border-zinc-300 pb-2">
                <span className="w-7 h-7 rounded-lg bg-[#FF2D55] print:bg-red-600 text-white font-black text-xs flex items-center justify-center">14</span>
                <h4 className="text-lg font-black uppercase tracking-tight text-white print:text-black flex items-center gap-2">
                  <Send size={18} className="text-[#FF2D55] print:text-red-600" />
                  Régua Automática WhatsApp
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 text-xs text-zinc-300 print:text-zinc-700 space-y-1">
                <p>• Veículo recebido no box</p>
                <p>• Diagnóstico e laudo concluídos</p>
                <p>• Orçamento disponível para aprovação</p>
                <p>• Serviço em andamento com fotos</p>
                <p>• Carro pronto e testado</p>
                <p>• Pesquisa de satisfação pós-entrega</p>
              </div>
            </div>
          </div>

          {/* SECTION 15, 16, 17: MARKETING, INSTAGRAM & REELS */}
          <div className="space-y-4 print:break-inside-avoid">
            <div className="flex items-center gap-3 border-b border-white/10 print:border-zinc-300 pb-2">
              <span className="w-7 h-7 rounded-lg bg-[#FF2D55] print:bg-red-600 text-white font-black text-xs flex items-center justify-center">15-17</span>
              <h4 className="text-xl font-black uppercase tracking-tight text-white print:text-black flex items-center gap-2">
                <Instagram size={20} className="text-[#FF2D55] print:text-red-600" />
                Estratégia de Marketing, Google Maps e Vídeos / Reels
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300">
                <p className="text-xl font-black text-[#FF2D55] print:text-red-600">40%</p>
                <p className="text-xs font-black uppercase text-white print:text-black">Autoridade</p>
                <p className="text-[10px] text-zinc-400 print:text-zinc-600">Dicas e diagnósticos</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300">
                <p className="text-xl font-black text-emerald-400 print:text-emerald-700">30%</p>
                <p className="text-xs font-black uppercase text-white print:text-black">Prova Social</p>
                <p className="text-[10px] text-zinc-400 print:text-zinc-600">Antes / Depois e entregas</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300">
                <p className="text-xl font-black text-blue-400 print:text-blue-700">20%</p>
                <p className="text-xs font-black uppercase text-white print:text-black">Venda Direta</p>
                <p className="text-[10px] text-zinc-400 print:text-zinc-600">Revisão, freios e pneus</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300">
                <p className="text-xl font-black text-purple-400 print:text-purple-700">10%</p>
                <p className="text-xs font-black uppercase text-white print:text-black">Marca & Equipe</p>
                <p className="text-[10px] text-zinc-400 print:text-zinc-600">Bastidores e dia a dia</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 print:bg-zinc-50 border border-white/5 print:border-zinc-200 text-xs text-zinc-300 print:text-zinc-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-[#FF2D55] print:text-red-600" />
                <span><strong>Fórmula de Reels:</strong> Gancho ➜ Problema ➜ Diagnóstico ➜ Solução Técnica ➜ Chamada para a {brandName}</span>
              </div>
            </div>
          </div>

          {/* SECTION 18, 19, 20: FINANCEIRO, ESTOQUE E SEGURANÇA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:break-inside-avoid">
            <div className="p-5 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 space-y-2">
              <p className="text-xs font-black uppercase text-white print:text-black flex items-center gap-1.5">
                <BarChart3 size={14} className="text-[#FF2D55] print:text-red-600" /> 18. GESTÃO FINANCEIRA
              </p>
              <p className="text-xs text-zinc-400 print:text-zinc-600">
                DRE automático separando Mão de Obra, Peças e Custos Operacionais com monitoramento de Ticket Médio e Margem Real.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 space-y-2">
              <p className="text-xs font-black uppercase text-white print:text-black flex items-center gap-1.5">
                <Package size={14} className="text-[#FF2D55] print:text-red-600" /> 19. ESTOQUE INTELIGENTE
              </p>
              <p className="text-xs text-zinc-400 print:text-zinc-600">
                Baixa automática ao aprovar a OS e alertas de ponto de pedido para peças de alto giro (óleos, pastilhas, filtros).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 space-y-2">
              <p className="text-xs font-black uppercase text-white print:text-black flex items-center gap-1.5">
                <Shield size={14} className="text-[#FF2D55] print:text-red-600" /> 20. SEGURANÇA & EPIS
              </p>
              <p className="text-xs text-zinc-400 print:text-zinc-600">
                Extintores válidos, óculos e luvas de proteção, área demarcada e descarte ambiental de fluidos e filtros usados.
              </p>
            </div>
          </div>

          {/* SECTION 21, 22, 23: PÓS-VENDA, SAÚDE DO CARRO E AS 3 FASES DE EVOLUÇÃO */}
          <div className="space-y-6 print:break-inside-avoid">
            <div className="flex items-center gap-3 border-b border-white/10 print:border-zinc-300 pb-2">
              <span className="w-7 h-7 rounded-lg bg-[#FF2D55] print:bg-red-600 text-white font-black text-xs flex items-center justify-center">21-23</span>
              <h4 className="text-xl font-black uppercase tracking-tight text-white print:text-black flex items-center gap-2">
                <Layers size={20} className="text-[#FF2D55] print:text-red-600" />
                As 3 Fases de Evolução da {brandName}
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900 print:bg-zinc-100 border-2 border-[#FF2D55]/40 print:border-red-400 space-y-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#FF2D55] text-white">
                  FASE 1 • IMEDIATA
                </span>
                <h5 className="text-sm font-black uppercase text-white print:text-black">Baixo Investimento</h5>
                <ul className="text-xs text-zinc-300 print:text-zinc-700 space-y-1 list-disc pl-4">
                  <li>Limpeza e organização total</li>
                  <li>Pintura externa e fachada moderna</li>
                  <li>Iluminação externa e interna</li>
                  <li>Uniformes oficiais da equipe</li>
                  <li>Google Maps & WhatsApp integrados</li>
                  <li>Instagram ativo com dicas e provas</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 space-y-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-zinc-800 print:bg-zinc-300 text-zinc-300 print:text-black">
                  FASE 2 • CONSOLIDAÇÃO
                </span>
                <h5 className="text-sm font-black uppercase text-white print:text-black">Investimento Médio</h5>
                <ul className="text-xs text-zinc-300 print:text-zinc-700 space-y-1 list-disc pl-4">
                  <li>Recepção estruturada e climatizada</li>
                  <li>Organização técnica avançada de boxes</li>
                  <li>Estoque com controle rigoroso</li>
                  <li>Sistema interno completo</li>
                  <li>Portal do cliente interativo</li>
                  <li>Novos scanners e ferramentas especiais</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900 print:bg-zinc-100 border border-white/10 print:border-zinc-300 space-y-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-zinc-800 print:bg-zinc-300 text-zinc-300 print:text-black">
                  FASE 3 • EXPANSÃO
                </span>
                <h5 className="text-sm font-black uppercase text-white print:text-black">Investimento Maior</h5>
                <ul className="text-xs text-zinc-300 print:text-zinc-700 space-y-1 list-disc pl-4">
                  <li>Piso epóxi profissional</li>
                  <li>Fachada premium em ACM</li>
                  <li>Logo 3D iluminado por LED</li>
                  <li>Recepção VIP executiva</li>
                  <li>Clube de fidelidade automotiva</li>
                  <li>Expansão de novos boxes e elevadores</li>
                </ul>
              </div>
            </div>
          </div>

          {/* MANIFESTO FINAL */}
          <div className="p-8 rounded-3xl bg-gradient-to-r from-black via-zinc-900 to-black print:bg-zinc-100 border border-white/15 print:border-zinc-300 text-center space-y-3 print:break-inside-avoid">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[#FF2D55] print:text-red-600 italic">
              VISÃO E POSICIONAMENTO DA MARCA
            </h4>
            <p className="text-lg md:text-xl font-black uppercase italic tracking-tight text-white print:text-black max-w-2xl mx-auto">
              "A {brandName} não deve ser conhecida apenas como uma oficina que conserta carros. Deve ser conhecida como a oficina em que o cliente confia para cuidar do seu carro."
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 print:text-zinc-600">
              <span>Profissionalizar Primeiro</span>
              <span>•</span>
              <span>Organizar Depois</span>
              <span>•</span>
              <span>Automatizar em Seguida</span>
              <span>•</span>
              <span>Evoluir Continuamente</span>
            </div>
          </div>

        </div>

        {/* DOCUMENT FOOTER */}
        <div className="pt-8 border-t border-white/10 print:border-zinc-300 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 print:text-zinc-600 gap-4">
          <div>
            <span>{brandName} • Registro, SP</span>
          </div>
          <div className="text-right">
            <span>Emitido pelo Sistema Integrado • {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
