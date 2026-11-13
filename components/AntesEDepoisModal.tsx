import React, { useState, useRef } from 'react';
import { 
  Camera, Check, X, ArrowRight, ArrowLeft, Download, 
  Share2, Printer, CheckCircle2, AlertTriangle, Trash2, 
  Car, Wrench, ShieldCheck, Sparkles, Image as ImageIcon
} from 'lucide-react';
import { ServiceOrder, ProofPhoto, UserSession } from '../types';
import html2canvas from 'html2canvas';

interface AntesEDepoisModalProps {
  isOpen: boolean;
  onClose: () => void;
  os: ServiceOrder;
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

export const AntesEDepoisModal: React.FC<AntesEDepoisModalProps> = ({
  isOpen,
  onClose,
  os,
  session,
  syncData
}) => {
  if (!isOpen || !os) return null;

  const [activeTab, setActiveTab] = useState<'COMPARATIVO' | 'NOVA_FOTO'>('COMPARATIVO');
  const [proofPhotos, setProofPhotos] = useState<ProofPhoto[]>(() => {
    if (os.proofPhotos && os.proofPhotos.length > 0) return os.proofPhotos;
    if (os.checklist?.proofPhotos && os.checklist.proofPhotos.length > 0) return os.checklist.proofPhotos;
    // If only basic checklist photos exist
    if (os.checklist?.photos && os.checklist.photos.length > 0) {
      return os.checklist.photos.map((p, idx) => ({
        id: `ph-legacy-${idx}`,
        type: 'BEFORE' as const,
        label: p.label || 'Vistoria Inicial',
        url: p.url,
        timestamp: os.createdAt
      }));
    }
    // No photos registered yet: start completely clean
    return [];
  });

  // State for adding a new "AFTER" photo
  const [newPhotoType, setNewPhotoType] = useState<'BEFORE' | 'AFTER'>('AFTER');
  const [newPhotoLabel, setNewPhotoLabel] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportDossierRef = useRef<HTMLDivElement>(null);

  const beforePhotos = proofPhotos.filter(p => p.type === 'BEFORE' || p.type === 'ENTRY' || p.type === 'DAMAGE');
  const afterPhotos = proofPhotos.filter(p => p.type === 'AFTER');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setNewPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNewPhoto = async () => {
    if (!newPhotoUrl || !session || !syncData) return;
    setIsSavingPhoto(true);

    try {
      const newPhotoObj: ProofPhoto = {
        id: `photo-${Date.now()}`,
        type: newPhotoType,
        label: newPhotoLabel || (newPhotoType === 'AFTER' ? 'Serviço Concluído / Entrega' : 'Vistoria de Chegada'),
        url: newPhotoUrl,
        timestamp: new Date().toISOString()
      };

      const updatedList = [...proofPhotos, newPhotoObj];
      setProofPhotos(updatedList);

      // Persist in orders
      const currentOrders: ServiceOrder[] = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_orders`) || '[]');
      const updatedOrders = currentOrders.map(order => {
        if (order.id === os.id) {
          return {
            ...order,
            proofPhotos: updatedList,
            photos: updatedList.map(p => ({ label: p.label, url: p.url })),
            checklist: {
              ...order.checklist,
              proofPhotos: updatedList,
              fuelLevel: order.checklist?.fuelLevel || '1/2',
              damages: order.checklist?.damages || [],
              items: order.checklist?.items || {},
              observations: order.checklist?.observations || ''
            },
            updatedAt: new Date().toISOString()
          };
        }
        return order;
      });

      await syncData('orders', updatedOrders);
      setNewPhotoUrl('');
      setNewPhotoLabel('');
      setActiveTab('COMPARATIVO');
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar foto no laudo.");
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Remover esta foto do laudo fotográfico?") || !session || !syncData) return;
    const updatedList = proofPhotos.filter(p => p.id !== photoId);
    setProofPhotos(updatedList);

    const currentOrders: ServiceOrder[] = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_orders`) || '[]');
    const updatedOrders = currentOrders.map(order => {
      if (order.id === os.id) {
        return {
          ...order,
          proofPhotos: updatedList,
          photos: updatedList.map(p => ({ label: p.label, url: p.url }))
        };
      }
      return order;
    });
    await syncData('orders', updatedOrders);
  };

  const downloadDossierImage = async () => {
    if (!reportDossierRef.current) return;
    setIsDownloading(true);

    try {
      const canvas = await html2canvas(reportDossierRef.current, {
        scale: 2.5,
        backgroundColor: '#0A0A0A',
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `KAEN_LAUDO_ANTES_DEPOIS_${os.osNumber}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar imagem do laudo.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    const phoneClean = (os.clientPhone || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `🏁 *AUTO MECÂNICA KAEN - LAUDO DE VISTORIA TÉCNICA*\n\n` +
      `Olá *${os.clientName}*! Registramos o acompanhamento visual do seu veículo *${os.vehicleModel}* (Placa *${os.vehiclePlate}*).\n\n` +
      `📋 *OS:* #${os.osNumber}\n` +
      `🔧 *Serviço:* ${os.problem}\n` +
      `📸 *Fotos de Entrada (Antes):* ${beforePhotos.length} registradas na recepção.\n` +
      `✨ *Fotos de Saída (Depois):* ${afterPhotos.length} registradas na conclusão.\n\n` +
      `Seu veículo passou por controle rigoroso de qualidade. Agradecemos a preferência!`
    );
    const url = phoneClean ? `https://wa.me/55${phoneClean}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0F0F10] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden text-left relative my-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-zinc-950 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF2D55]/10 border border-[#FF2D55]/20 text-[#FF2D55] flex items-center justify-center">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase italic tracking-wider text-white">
                VISTORIA FOTOGRÁFICA: <span className="text-[#FF2D55]">ANTES & DEPOIS</span>
              </h2>
              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                OS #{os.osNumber} • {os.vehiclePlate} ({os.vehicleModel})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-emerald-500/30"
              title="Compartilhar no WhatsApp"
            >
              <Share2 size={12} /> <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={downloadDossierImage}
              disabled={isDownloading}
              className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-white/10"
              title="Baixar Imagem"
            >
              <Download size={12} /> <span className="hidden sm:inline">{isDownloading ? 'Gerando...' : 'Baixar Imagem'}</span>
            </button>
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-3 bg-black/40 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('COMPARATIVO')}
              className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
                ${activeTab === 'COMPARATIVO' ? 'bg-[#FF2D55] text-white shadow-lg' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
            >
              Laudo Comparativo ({beforePhotos.length} Antes / {afterPhotos.length} Depois)
            </button>
            <button
              onClick={() => {
                setActiveTab('NOVA_FOTO');
                setNewPhotoType('AFTER');
              }}
              className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5
                ${activeTab === 'NOVA_FOTO' ? 'bg-[#FF2D55] text-white shadow-lg' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
            >
              <Camera size={12} /> Bater Foto da Conclusão (Depois)
            </button>
          </div>

          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:inline">
            Auto Mecânica Kaen • Registro/SP
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] space-y-6">
          {activeTab === 'COMPARATIVO' ? (
            <div className="space-y-6">
              {/* The printable/exportable Dossier Card */}
              <div 
                ref={reportDossierRef}
                className="p-5 sm:p-8 bg-[#0A0A0B] border border-white/10 rounded-3xl space-y-6 text-white shadow-2xl"
              >
                {/* Dossier Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FF2D55] flex items-center justify-center text-white shadow-lg shadow-[#FF2D55]/30">
                      <Wrench size={24} />
                    </div>
                    <div>
                      <h1 className="text-xl font-black uppercase italic tracking-tight">AUTO MECÂNICA KAEN</h1>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        Laudo Técnico & Vistoria Comparativa de Pátio
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#FF2D55] bg-[#FF2D55]/10 px-2.5 py-1 rounded-lg border border-[#FF2D55]/20">
                      O.S. #{os.osNumber}
                    </span>
                    <p className="text-xs font-black uppercase text-white mt-1">{os.vehiclePlate} • {os.vehicleModel}</p>
                    <p className="text-[9px] text-zinc-500">Cliente: {os.clientName}</p>
                  </div>
                </div>

                {/* Side-by-side Grid: ANTES vs DEPOIS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* LEFT COLUMN: ANTES (ENTRADA) */}
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <AlertTriangle size={14} /> ANTES (Recepção de Pátio)
                      </span>
                      <span className="text-[8px] font-bold text-zinc-400">
                        {new Date(os.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {beforePhotos.length === 0 ? (
                      <div className="p-8 bg-zinc-950 border border-dashed border-white/10 rounded-2xl text-center space-y-2">
                        <Camera size={24} className="mx-auto text-zinc-600" />
                        <p className="text-xs font-bold text-zinc-500 uppercase">Nenhuma foto de entrada registrada</p>
                        <button
                          onClick={() => {
                            setActiveTab('NOVA_FOTO');
                            setNewPhotoType('BEFORE');
                          }}
                          className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-[9px] font-black uppercase"
                        >
                          + Adicionar Foto do Antes
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {beforePhotos.map(photo => (
                          <div key={photo.id} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                            <div className="aspect-video w-full overflow-hidden bg-black/60">
                              <img src={photo.url} alt={photo.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="p-3 bg-zinc-950 border-t border-white/5 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-black uppercase text-white">{photo.label}</p>
                                <span className="text-[8px] text-zinc-500 uppercase font-mono">
                                  {new Date(photo.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Entrada
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="text-zinc-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Excluir foto"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: DEPOIS (SAÍDA / CONCLUSÃO) */}
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 size={14} /> DEPOIS (Serviço Concluído)
                      </span>
                      <span className="text-[8px] font-bold text-zinc-400">
                        {new Date(os.updatedAt || os.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {afterPhotos.length === 0 ? (
                      <div className="p-8 bg-zinc-950 border border-dashed border-emerald-500/30 rounded-2xl text-center space-y-3">
                        <Sparkles size={24} className="mx-auto text-emerald-400" />
                        <p className="text-xs font-bold text-zinc-400 uppercase">Aguardando foto da conclusão</p>
                        <p className="text-[9px] text-zinc-600">Bata uma foto do serviço finalizado (peça nova, farol aceso, alinhamento)</p>
                        <button
                          onClick={() => {
                            setActiveTab('NOVA_FOTO');
                            setNewPhotoType('AFTER');
                          }}
                          className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <Camera size={14} /> Bater Foto da Conclusão (Depois)
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {afterPhotos.map(photo => (
                          <div key={photo.id} className="group relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-black">
                            <div className="aspect-video w-full overflow-hidden bg-black/60">
                              <img src={photo.url} alt={photo.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="p-3 bg-zinc-950 border-t border-white/5 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-black uppercase text-emerald-400">{photo.label}</p>
                                <span className="text-[8px] text-zinc-500 uppercase font-mono">
                                  {new Date(photo.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Conclusão
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="text-zinc-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Excluir foto"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => {
                            setActiveTab('NOVA_FOTO');
                            setNewPhotoType('AFTER');
                          }}
                          className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-dashed border-white/10 rounded-xl text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-white flex items-center justify-center gap-2"
                        >
                          <Camera size={12} /> + Adicionar Outra Foto do Depois
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer notes on dossier */}
                <div className="p-4 bg-zinc-950 border border-white/5 rounded-2xl text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                  <div>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase block">Serviços Executados:</span>
                    <p className="text-white font-bold uppercase">{os.problem}</p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase block">Garantia Kaen:</span>
                    <p className="text-emerald-400 font-bold">90 Dias Mão de Obra e Peças</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= TAB 2: REGISTRAR NOVA FOTO (ANTES OU DEPOIS) ================= */
            <div className="space-y-5 max-w-md mx-auto text-left animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FF2D55]">Captura de Imagem</span>
                <h3 className="text-base font-black uppercase italic tracking-tight text-white">
                  Registrar Foto: {newPhotoType === 'AFTER' ? 'Depois do Reparo' : 'Antes do Reparo'}
                </h3>
                <p className="text-[10px] text-zinc-400">Use a câmera do seu celular para bater a foto na hora</p>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewPhotoType('BEFORE')}
                  className={`py-2.5 rounded-xl border text-xs font-black uppercase transition-all
                    ${newPhotoType === 'BEFORE' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-zinc-950 border-white/5 text-zinc-500'}`}
                >
                  Foto do ANTES (Chegada)
                </button>
                <button
                  type="button"
                  onClick={() => setNewPhotoType('AFTER')}
                  className={`py-2.5 rounded-xl border text-xs font-black uppercase transition-all
                    ${newPhotoType === 'AFTER' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-white/5 text-zinc-500'}`}
                >
                  Foto do DEPOIS (Concluído)
                </button>
              </div>

              {/* Camera Area */}
              <div className="aspect-video bg-black rounded-2xl border border-white/10 overflow-hidden relative flex items-center justify-center">
                {newPhotoUrl ? (
                  <>
                    <img src={newPhotoUrl} alt="Foto Capturada" className="w-full h-full object-cover" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-3 right-3 py-1.5 px-3 bg-black/80 rounded-xl text-[9px] font-black uppercase text-white border border-white/20"
                    >
                      Trocar Foto
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2.5 text-zinc-500 hover:text-white transition-colors"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-[#FF2D55]">
                      <Camera size={26} />
                    </div>
                    <span className="text-xs font-black uppercase text-white">BATER FOTO COM A CÂMERA</span>
                    <span className="text-[8px] text-zinc-500">Abre a câmera traseira do smartphone</span>
                  </button>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />
              </div>

              {/* Label */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500">
                  Legenda / O que foi feito nesta foto?
                </label>
                <input 
                  type="text" 
                  value={newPhotoLabel}
                  onChange={(e) => setNewPhotoLabel(e.target.value)}
                  placeholder={newPhotoType === 'AFTER' ? 'Ex: Peça nova original instalada e testada' : 'Ex: Peça desgastada / dano na chegada'}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white font-bold"
                />
                
                {/* Sugestões Rápidas */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(newPhotoType === 'AFTER' ? [
                    'Peça Nova Instalada',
                    'Freios e Pastilhas OK',
                    'Suspensão Ajustada',
                    'Óleo e Filtros Trocados',
                    'Farol / Elétrica Testado',
                    'Motor Limpo e Finalizado',
                    'Teste de Rodagem Aprovado'
                  ] : [
                    'Peça Desgastada / Trincada',
                    'Disco de Freio Danificado',
                    'Vazamento Identificado',
                    'Amassado / Arranhão Entrada',
                    'Farol Apagado / Quebrado',
                    'Pneu / Roda Avariado'
                  ]).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewPhotoLabel(tag)}
                      className="px-2.5 py-1 bg-zinc-900/80 hover:bg-zinc-800 border border-white/5 rounded-lg text-[8px] font-bold text-zinc-400 hover:text-white transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setActiveTab('COMPARATIVO')}
                  className="w-1/3 py-3.5 bg-zinc-950 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-wider text-zinc-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNewPhoto}
                  disabled={!newPhotoUrl || isSavingPhoto}
                  className="flex-1 bg-[#FF2D55] hover:bg-[#ff1744] disabled:opacity-50 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest text-white flex items-center justify-center gap-2 shadow-lg shadow-[#FF2D55]/30"
                >
                  <Check size={16} />
                  <span>{isSavingPhoto ? 'SALVANDO...' : 'SALVAR NO LAUDO'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AntesEDepoisModal;
