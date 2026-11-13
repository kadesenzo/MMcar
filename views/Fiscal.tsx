import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Building2,
  Printer,
  ImageIcon,
  Plus,
  CheckCircle2,
  Save,
  X,
  Search,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import html2canvas from 'html2canvas';
import {
  FiscalConfig,
  FiscalDocument,
  ServiceOrder,
  UserSession
} from '../types';
import {
  loadMMCarFiscalConfig,
  readWorkshopData,
  writeWorkshopData,
  appendAuditLog
} from '../src/utils/workshopHelpers';
import Invoice from '../components/Invoice';

interface FiscalProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

const Fiscal: React.FC<FiscalProps> = ({ session, syncData }) => {
  const tenant = session?.username || 'rafael';
  const activeUser = session?.activeUser || session?.username || 'Diretoria';

  const [activeTab, setActiveTab] = useState<'NOTAS' | 'EMPRESA'>('NOTAS');
  const [config, setConfig] = useState<FiscalConfig>(() => loadMMCarFiscalConfig(tenant));
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Emitir Nota modal state
  const [showEmitModal, setShowEmitModal] = useState(false);
  const [selectedOsId, setSelectedOsId] = useState('');
  const [docType, setDocType] = useState<'NF-E' | 'NFC-E' | 'NFS-E'>('NFS-E');
  const [clientDoc, setClientDoc] = useState('');
  const [docNotes, setDocNotes] = useState('');

  // Preview OS Invoice modal
  const [previewOrder, setPreviewOrder] = useState<ServiceOrder | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const loadAll = () => {
    setConfig(loadMMCarFiscalConfig(tenant));
    setDocuments(readWorkshopData<FiscalDocument[]>(tenant, 'fiscal_documents', []));
    setOrders(readWorkshopData<ServiceOrder[]>(tenant, 'orders', []));
  };

  useEffect(() => {
    loadAll();
    window.addEventListener('kaen_storage_updated', loadAll);
    return () => window.removeEventListener('kaen_storage_updated', loadAll);
  }, [tenant]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: FiscalConfig = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    setConfig(updated);
    writeWorkshopData(tenant, 'fiscal_config', updated);
    if (syncData) {
      await syncData('fiscal_config', updated);
    }
    appendAuditLog(
      tenant,
      activeUser,
      'ATUALIZOU_DADOS_MMCAR_NOTA',
      updated.tradeName,
      `CNPJ ${updated.cnpj} • ${updated.address || ''}`
    );
    setSaveMessage('Dados da MM Car salvos e aplicados em todas as notas!');
    setTimeout(() => setSaveMessage(''), 4000);
  };

  const handleEmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const os = orders.find(o => o.id === selectedOsId);
    if (!os) return;

    const partsValue = (os.items || [])
      .filter(i => i.type === 'PART')
      .reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const servicesValue = Math.max(0, os.totalValue - partsValue);

    const taxRate = docType === 'NFS-E' ? config.defaultIssRate : config.defaultIcmsRate;
    const taxesEstimated = Number(((os.totalValue * taxRate) / 100).toFixed(2));

    const series =
      docType === 'NF-E'
        ? config.nfeSeries
        : docType === 'NFC-E'
          ? config.nfceSeries
          : config.nfseSeries;

    const nextNum = String(documents.length + 1001).padStart(6, '0');
    const randDigits = `${Date.now()}${Math.floor(100000 + Math.random() * 899999)}`.slice(-18);

    const newDoc: FiscalDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: docType,
      number: nextNum,
      series,
      osId: os.id,
      osNumber: os.osNumber,
      clientName: os.clientName,
      clientDocument: clientDoc || 'Consumidor Final',
      vehiclePlate: os.vehiclePlate,
      partsValue,
      servicesValue,
      totalValue: os.totalValue,
      taxesEstimated,
      accessKey: `35${new Date().getFullYear().toString().slice(-2)}04${config.cnpj.replace(/\D/g, '')}55001${nextNum}${randDigits}`.slice(0, 44),
      protocolNumber: `135${Date.now().toString().slice(-12)}`,
      status: 'AUTORIZADA',
      environment: config.environment,
      issuedBy: activeUser,
      issuedAt: new Date().toISOString(),
      notes: docNotes || `${config.tradeName} • OS #${os.osNumber} • Placa ${os.vehiclePlate}`
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);
    writeWorkshopData(tenant, 'fiscal_documents', updated);
    if (syncData) {
      await syncData('fiscal_documents', updated);
    }
    appendAuditLog(
      tenant,
      activeUser,
      'EMITIU_NOTA_FISCAL',
      `${docType} #${nextNum}`,
      `OS #${os.osNumber} • R$ ${os.totalValue.toFixed(2)}`
    );

    setShowEmitModal(false);
    setSelectedOsId('');
    setClientDoc('');
    setDocNotes('');
    setPreviewOrder(os);
  };

  const downloadInvoicePng = async () => {
    const target = document.getElementById('render-target-hidden');
    if (!target || !previewOrder || !invoiceRef.current) return;

    const clone = invoiceRef.current.cloneNode(true) as HTMLDivElement;
    clone.style.width = '794px';
    clone.style.height = 'auto';
    clone.style.position = 'static';

    target.innerHTML = '';
    target.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2.5,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        width: 794,
        height: clone.offsetHeight
      });
      const link = document.createElement('a');
      link.download = `MM_CAR_NOTA_OS_${previewOrder.osNumber}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch {
      alert('Erro ao gerar imagem PNG da nota.');
    } finally {
      target.innerHTML = '';
    }
  };

  const filteredDocs = documents.filter(d => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      d.clientName.toLowerCase().includes(q) ||
      (d.osNumber || '').includes(q) ||
      d.number.includes(q) ||
      (d.vehiclePlate || '').toLowerCase().includes(q)
    );
  });

  const totalIssuedValue = documents
    .filter(d => d.status !== 'CANCELADA')
    .reduce((acc, d) => acc + d.totalValue, 0);

  return (
    <div className="w-full max-w-[1200px] space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-zinc-950/80 border border-white/5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 text-[#FF2D55] text-xs font-black uppercase tracking-widest">
            <Receipt size={16} />
            <span>Central Fiscal & Comprovantes de OS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1 italic">
            Notas MM Car Auto Center
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {config.companyName} • CNPJ {config.cnpj} • {config.address}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('NOTAS')}
            className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'NOTAS'
                ? 'bg-[#FF2D55] text-white shadow-lg shadow-[#FF2D55]/25'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
            }`}
          >
            Notas & OS ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('EMPRESA')}
            className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'EMPRESA'
                ? 'bg-[#FF2D55] text-white shadow-lg shadow-[#FF2D55]/25'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
            }`}
          >
            <Building2 size={15} /> Dados MM Car na Nota
          </button>
          <button
            onClick={() => setShowEmitModal(true)}
            className="px-4 py-3 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <Plus size={15} /> Emitir Nota
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{saveMessage}</span>
        </div>
      )}

      {activeTab === 'NOTAS' ? (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-zinc-950 border border-white/5 rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Emitente Padrão</p>
              <p className="text-lg font-black text-white mt-1 uppercase">{config.tradeName}</p>
              <p className="text-xs text-zinc-400 mt-0.5">CNPJ: {config.cnpj} • IE: {config.ie}</p>
            </div>
            <div className="p-6 bg-zinc-950 border border-white/5 rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Notas Emitidas</p>
              <p className="text-2xl font-black text-white mt-1">{documents.length}</p>
              <p className="text-xs text-emerald-400 font-bold mt-0.5">Ambiente: {config.environment}</p>
            </div>
            <div className="p-6 bg-zinc-950 border border-white/5 rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Volume Fiscal Registrado</p>
              <p className="text-2xl font-black text-white mt-1">
                R$ {totalIssuedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">Regime: {config.taxRegime.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Search */}
          <div className="bg-zinc-950 border border-white/5 rounded-2xl p-2 flex items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3 text-zinc-500" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar nota por cliente, placa, número ou OS..."
                className="w-full bg-transparent py-2.5 pl-11 pr-4 text-xs text-white placeholder-zinc-600 outline-none"
              />
            </div>
          </div>

          {/* Documents List + Quick OS Notes */}
          {filteredDocs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 px-1">
                Notas Fiscais Emitidas ({config.tradeName})
              </h2>
              {filteredDocs.map(doc => {
                const linkedOs = orders.find(o => o.id === doc.osId || o.osNumber === doc.osNumber);
                return (
                  <div
                    key={doc.id}
                    className="p-5 bg-zinc-950 border border-white/5 hover:border-white/15 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#FF2D55]/15 text-[#FF2D55] text-[10px] font-black uppercase">
                          {doc.type} #{doc.number}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase">
                          {doc.status}
                        </span>
                        {doc.osNumber && (
                          <span className="text-xs font-black text-white">OS #{doc.osNumber}</span>
                        )}
                        {doc.vehiclePlate && (
                          <span className="text-xs font-mono text-zinc-400">{doc.vehiclePlate}</span>
                        )}
                      </div>
                      <p className="text-sm font-black text-white uppercase">{doc.clientName}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        Emitente: {config.companyName} ({config.cnpj}) • Chave: {doc.accessKey}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-black text-white">
                          R$ {doc.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {new Date(doc.issuedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {linkedOs && (
                        <button
                          onClick={() => setPreviewOrder(linkedOs)}
                          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <FileText size={14} /> Ver Nota MM Car
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Service Orders Notes Quick Access */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 px-1">
              Notas de Ordem de Serviço — {config.tradeName} ({orders.length})
            </h2>
            {orders.length === 0 ? (
              <div className="p-12 bg-zinc-950/50 border border-dashed border-white/10 rounded-3xl text-center text-xs text-zinc-500 uppercase font-bold">
                Nenhuma Ordem de Serviço cadastrada ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.slice(0, 12).map(os => (
                  <div
                    key={os.id}
                    className="p-5 bg-zinc-950 border border-white/5 hover:border-white/15 rounded-3xl flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#FF2D55]">OS #{os.osNumber}</span>
                        <span className="text-[10px] font-mono text-zinc-400">{os.vehiclePlate}</span>
                      </div>
                      <p className="text-sm font-black text-white uppercase truncate">{os.clientName}</p>
                      <p className="text-xs text-zinc-500 truncate">{os.vehicleModel}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-black text-white">
                        R$ {os.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => setPreviewOrder(os)}
                        className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-[#FF2D55] text-white border border-white/10 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Printer size={14} /> Nota
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB: DADOS DA EMPRESA MM CAR NA NOTA */
        <form onSubmit={handleSaveConfig} className="p-6 sm:p-8 bg-zinc-950 border border-white/10 rounded-[2rem] space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#FF2D55]" />
                Informações da MM Car Auto Center nas Notas
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Todos os dados preenchidos abaixo aparecem automaticamente no cabeçalho, rodapé e laudos das notas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                Nome Fantasia (Destaque na Nota)
              </label>
              <input
                required
                type="text"
                value={config.tradeName}
                onChange={e => setConfig({ ...config, tradeName: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                Razão Social
              </label>
              <input
                required
                type="text"
                value={config.companyName}
                onChange={e => setConfig({ ...config, companyName: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                CNPJ
              </label>
              <input
                required
                type="text"
                value={config.cnpj}
                onChange={e => setConfig({ ...config, cnpj: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                  Inscrição Estadual (IE)
                </label>
                <input
                  type="text"
                  value={config.ie}
                  onChange={e => setConfig({ ...config, ie: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                  Inscrição Municipal (IM)
                </label>
                <input
                  type="text"
                  value={config.im}
                  onChange={e => setConfig({ ...config, im: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                Endereço Completo na Nota
              </label>
              <input
                required
                type="text"
                value={config.address || ''}
                onChange={e => setConfig({ ...config, address: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                WhatsApp / Telefone Oficial
              </label>
              <input
                required
                type="text"
                value={config.phone || ''}
                onChange={e => setConfig({ ...config, phone: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                E-mail Comercial
              </label>
              <input
                type="email"
                value={config.email || ''}
                onChange={e => setConfig({ ...config, email: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                Cidade / UF
              </label>
              <input
                type="text"
                value={config.cityState || ''}
                onChange={e => setConfig({ ...config, cityState: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                Regime Tributário
              </label>
              <select
                value={config.taxRegime}
                onChange={e => setConfig({ ...config, taxRegime: e.target.value as FiscalConfig['taxRegime'] })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
              >
                <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                <option value="LUCRO_REAL">Lucro Real</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3.5 rounded-2xl bg-[#FF2D55] hover:bg-[#ff1744] text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#FF2D55]/30 cursor-pointer"
            >
              <Save size={16} /> Salvar Dados da MM Car
            </button>
          </div>
        </form>
      )}

      {/* MODAL EMITIR NOTA */}
      {showEmitModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-[2rem] w-full max-w-lg p-6 sm:p-8 space-y-5 relative">
            <button
              onClick={() => setShowEmitModal(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF2D55]">
                {config.tradeName} • CNPJ {config.cnpj}
              </span>
              <h3 className="text-xl font-black uppercase text-white mt-1">Emitir Nota Fiscal / Comprovante</h3>
            </div>

            <form onSubmit={handleEmitDocument} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                  Tipo de Documento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['NFS-E', 'NF-E', 'NFC-E'] as const).map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setDocType(t)}
                      className={`py-2.5 rounded-xl text-xs font-black uppercase border cursor-pointer ${
                        docType === t
                          ? 'bg-[#FF2D55] text-white border-[#FF2D55]'
                          : 'bg-black text-zinc-400 border-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                  Ordem de Serviço Vinculada
                </label>
                <select
                  required
                  value={selectedOsId}
                  onChange={e => setSelectedOsId(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
                >
                  <option value="">Selecione uma OS...</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      OS #{o.osNumber} — {o.clientName} ({o.vehiclePlate}) — R$ {o.totalValue.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                  CPF / CNPJ do Tomador (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={clientDoc}
                  onChange={e => setClientDoc(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                  Observações Complementares
                </label>
                <input
                  type="text"
                  placeholder={`Serviços executados pela ${config.tradeName}`}
                  value={docNotes}
                  onChange={e => setDocNotes(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#FF2D55] hover:bg-[#ff1744] text-white text-xs font-black uppercase tracking-widest cursor-pointer"
              >
                Autorizar e Gerar Nota MM Car
              </button>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE A4 MODAL */}
      {previewOrder && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/95 backdrop-blur-3xl overflow-y-auto no-scrollbar">
          <div className="w-full max-w-[850px] flex flex-col items-center gap-8 my-16 px-4">
            <button
              onClick={() => setPreviewOrder(null)}
              className="fixed top-6 right-6 text-white bg-white/10 p-4 rounded-full hover:bg-[#FF2D55] transition-all z-[220] border border-white/10 cursor-pointer"
            >
              <X size={24} />
            </button>

            <div className="invoice-preview-wrapper">
              <div className="invoice-container-scaled">
                <div ref={invoiceRef}>
                  <Invoice os={previewOrder} tenant={tenant} />
                </div>
              </div>
            </div>

            <div className="w-full max-w-[460px] flex flex-col sm:flex-row gap-3 px-4 pb-16">
              <button
                onClick={downloadInvoicePng}
                className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <ImageIcon size={18} /> Salvar PNG
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-zinc-900 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 border border-white/10 text-white cursor-pointer"
              >
                <Printer size={18} /> Imprimir A4
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fiscal;
