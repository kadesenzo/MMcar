import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, ChevronLeft, X, User, Search, Loader2,
  ImageIcon, Car, Camera, Sparkles, MapPin, Users, Wrench
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Client, Vehicle, OSItem, OSStatus, ServiceOrder, PaymentStatus,
  UserSession, Part, Employee, WorkshopBox
} from '../types';
import html2canvas from 'html2canvas';
import Invoice from '../components/Invoice';
import PatioCheckinModal from '../components/PatioCheckinModal';
import {
  readWorkshopData, writeWorkshopData, loadOrInitBoxes,
  createOSTimelineEvent, appendAuditLog
} from '../src/utils/workshopHelpers';

const NewServiceOrder: React.FC<{ session?: UserSession; syncData?: (key: string, data: any) => Promise<void> }> = ({ session, syncData }) => {
  const navigate = useNavigate();
  const previewRef = React.useRef<HTMLDivElement>(null);
  const tenant = session?.username || 'rafael';
  const activeUser = session?.activeUser || session?.username || 'Recepção';

  const [step, setStep] = useState<'CLIENTE' | 'VEICULO' | 'ITENS' | 'FINAL'>('CLIENTE');
  const [showPatioModal, setShowPatioModal] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [boxes, setBoxes] = useState<WorkshopBox[]>([]);

  const [clientSearch, setClientSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [showPartSearch, setShowPartSearch] = useState(false);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [showQuickClient, setShowQuickClient] = useState(false);
  const [showQuickVehicle, setShowQuickVehicle] = useState(false);

  const [quickClient, setQuickClient] = useState({ name: '', phone: '' });
  const [quickVehicle, setQuickVehicle] = useState({ model: '', plate: '', km: '' });

  const [problem, setProblem] = useState('');
  const [items, setItems] = useState<OSItem[]>([]);
  const [labor, setLabor] = useState<string>('0');
  const [discount, setDiscount] = useState<string>('0');
  const [noteKm, setNoteKm] = useState<string>('');
  const [selectedBox, setSelectedBox] = useState<string>('');
  const [selectedMechanics, setSelectedMechanics] = useState<string[]>([]);
  const [targetStatus, setTargetStatus] = useState<OSStatus>(OSStatus.EM_SERVICO);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.PENDENTE);

  const [finalOs, setFinalOs] = useState<ServiceOrder | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = () => {
    const savedClients = readWorkshopData<Client[]>(tenant, 'clients', []);
    const savedVehicles = readWorkshopData<Vehicle[]>(tenant, 'vehicles', []);
    const savedParts = readWorkshopData<Part[]>(tenant, 'parts', []);
    const savedEmployees = readWorkshopData<Employee[]>(tenant, 'employees', []);
    const savedOrders = readWorkshopData<ServiceOrder[]>(tenant, 'orders', []);
    setClients(savedClients);
    setVehicles(savedVehicles);
    setParts(savedParts);
    setEmployees(savedEmployees);
    setBoxes(loadOrInitBoxes(tenant, savedOrders));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [tenant]);

  const mechanicPool = useMemo(() => {
    const names = new Set<string>(['Eduardo', 'Thiago']);
    employees
      .filter(e => e.status === 'Ativo' && (e.role.includes('Mec') || e.role.includes('Téc')))
      .forEach(e => names.add(e.name));
    return Array.from(names);
  }, [employees]);

  const totalValue = useMemo(() => {
    const itemsTotal = items.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);
    return Math.max(0, itemsTotal + (parseFloat(labor) || 0) - (parseFloat(discount) || 0));
  }, [items, labor, discount]);

  const handleFinalize = async () => {
    if (!selectedClient || !selectedVehicle || !session) return;
    setIsSaving(true);
    try {
      // Subtract parts from inventory only if status is active execution / finalized
      const shouldDeductStock = ![OSStatus.ORCAMENTO_ENVIADO, OSStatus.AGUARDANDO_APROVACAO, OSStatus.ORCAMENTO].includes(targetStatus);
      if (shouldDeductStock) {
        let updatedParts = [...parts];
        items.forEach(item => {
          if (item.type === 'PART') {
            const pIndex = updatedParts.findIndex(
              p => (item.partId && p.id === item.partId) || p.name.toUpperCase() === item.description.toUpperCase()
            );
            if (pIndex !== -1) {
              updatedParts[pIndex] = {
                ...updatedParts[pIndex],
                stock: Math.max(0, updatedParts[pIndex].stock - item.quantity)
              };
            }
          }
        });
        if (JSON.stringify(updatedParts) !== JSON.stringify(parts)) {
          writeWorkshopData(tenant, 'parts', updatedParts);
          if (syncData) await syncData('parts', updatedParts);
          setParts(updatedParts);
        }
      }

      const parsedNoteKm = parseInt(noteKm.replace(/\D/g, ''), 10);
      const hasValidNoteKm = noteKm.trim() !== '' && !isNaN(parsedNoteKm) && parsedNoteKm >= 0;
      const finalKmStr = hasValidNoteKm
        ? parsedNoteKm.toString()
        : selectedVehicle.km !== undefined && selectedVehicle.km !== null
          ? selectedVehicle.km.toString()
          : '0';

      const osNumber = `${Math.floor(100000 + Math.random() * 899999)}`;
      const isApproved = [OSStatus.EM_SERVICO, OSStatus.FINALIZACAO, OSStatus.PRONTO, OSStatus.ENTREGUE, OSStatus.FINALIZADO].includes(targetStatus);

      const os: ServiceOrder = {
        id: `os-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        osNumber,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        vehicleId: selectedVehicle.id,
        vehiclePlate: selectedVehicle.plate,
        vehicleModel: selectedVehicle.model,
        vehicleKm: finalKmStr,
        boxNumber: selectedBox || undefined,
        receptionistName: activeUser,
        mechanicResponsible: selectedMechanics[0] || undefined,
        assignedMechanics: selectedMechanics,
        mechanicStatus: targetStatus === OSStatus.EM_SERVICO ? 'NAO_INICIADO' : undefined,
        problem: problem.trim() || 'Manutenção técnica e revisão MM Car Auto Center',
        diagnosticNotes: problem.trim() || undefined,
        items,
        laborValue: parseFloat(labor) || 0,
        discount: parseFloat(discount) || 0,
        totalValue,
        status: targetStatus,
        budgetApproved: isApproved,
        paymentStatus,
        timeline: [
          createOSTimelineEvent(
            'ABERTURA_OS',
            `OS #${osNumber} criada (${targetStatus}) • Box: ${selectedBox || 'Pátio'} • Equipe: ${selectedMechanics.join(', ') || 'A definir'}`,
            activeUser,
            session.role
          )
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (hasValidNoteKm && parsedNoteKm > 0 && parsedNoteKm !== selectedVehicle.km && (parsedNoteKm >= (selectedVehicle.km || 0) || !selectedVehicle.km)) {
        const updatedVehicles = vehicles.map(v =>
          v.id === selectedVehicle.id ? { ...v, km: parsedNoteKm } : v
        );
        setVehicles(updatedVehicles);
        setSelectedVehicle({ ...selectedVehicle, km: parsedNoteKm });
        writeWorkshopData(tenant, 'vehicles', updatedVehicles);
        if (syncData) await syncData('vehicles', updatedVehicles);
      }

      const currentOrders = readWorkshopData<ServiceOrder[]>(tenant, 'orders', []);
      const nextOrders = [...currentOrders, os];
      writeWorkshopData(tenant, 'orders', nextOrders);
      if (syncData) await syncData('orders', nextOrders);
      appendAuditLog(tenant, activeUser, 'ABRIU_OS', `OS #${osNumber}`, `${selectedVehicle.plate} • R$ ${totalValue.toFixed(2)}`);

      setFinalOs(os);
      setStep('FINAL');
    } catch (error) {
      alert('Erro ao processar abertura da Ordem de Serviço.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateQuickClient = async () => {
    if (!quickClient.name || !quickClient.phone || !session) return;
    const newC: Client = {
      id: `cli-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: quickClient.name.toUpperCase(),
      phone: quickClient.phone,
      document: '---',
      observations: 'Cadastrado na abertura de OS',
      createdAt: new Date().toISOString()
    };
    const updated = [...clients, newC];
    setClients(updated);
    writeWorkshopData(tenant, 'clients', updated);
    if (syncData) await syncData('clients', updated);
    setSelectedClient(newC);
    setShowQuickClient(false);
    setStep('VEICULO');
  };

  const handleCreateQuickVehicle = async () => {
    if (!selectedClient || !quickVehicle.model || !quickVehicle.plate || !session) return;
    const newV: Vehicle = {
      id: `veh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: selectedClient.id,
      model: quickVehicle.model.toUpperCase(),
      plate: quickVehicle.plate.toUpperCase(),
      brand: '---',
      year: '---',
      km: parseInt(quickVehicle.km) || 0
    };
    const updated = [...vehicles, newV];
    setVehicles(updated);
    writeWorkshopData(tenant, 'vehicles', updated);
    if (syncData) await syncData('vehicles', updated);
    setSelectedVehicle(newV);
    setNoteKm(newV.km ? newV.km.toString() : '');
    setShowQuickVehicle(false);
    setStep('ITENS');
  };

  const handleAddPartFromInventory = (part: Part) => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: part.name.toUpperCase(),
        quantity: 1,
        unitPrice: part.salePrice,
        costPrice: part.costPrice,
        partId: part.id,
        type: 'PART'
      }
    ]);
    setShowPartSearch(false);
    setPartSearch('');
  };

  const downloadImage = async () => {
    const target = document.getElementById('render-target-hidden');
    if (!target || !finalOs || !previewRef.current) return;
    setIsSaving(true);

    const clone = previewRef.current.cloneNode(true) as HTMLDivElement;
    clone.style.width = '794px';
    clone.style.height = 'auto';
    clone.style.position = 'static';

    target.innerHTML = '';
    target.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        width: 794,
        height: clone.offsetHeight
      });
      const link = document.createElement('a');
      link.download = `MM_CAR_OS_${finalOs.osNumber}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch {
      alert('Houve um erro ao gerar a imagem da ordem de serviço.');
    } finally {
      target.innerHTML = '';
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white items-center w-full">
      <div className="w-full p-5 flex items-center justify-between bg-zinc-950/90 border-b border-white/10 sticky top-0 z-50">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white/5 rounded-2xl text-zinc-400 hover:text-white border border-white/10 active:scale-90 transition-all cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#FF2D55] block">MM Car Auto Center</span>
          <h2 className="text-xs font-black uppercase tracking-widest">Abertura de Ordem de Serviço / Orçamento</h2>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 w-full max-w-4xl p-6 md:p-10 space-y-10 pb-36 flex flex-col items-center">
        {step === 'CLIENTE' && (
          <div className="w-full max-w-2xl space-y-8 animate-in slide-in-from-bottom-6 duration-500 flex flex-col items-center">
            <button
              onClick={() => setShowPatioModal(true)}
              className="w-full p-6 bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border border-[#FF2D55]/40 hover:border-[#FF2D55] rounded-[2rem] flex items-center justify-between group shadow-2xl transition-all active:scale-95 cursor-pointer"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#FF2D55] text-white flex items-center justify-center shadow-lg shadow-[#FF2D55]/30">
                  <Camera size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#FF2D55] block">CHECK-IN DE PÁTIO (10 CATEGORIAS)</span>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Entrada de Veículo + Vistoria Completa
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Registre fotos, combustível, box e confirmação do cliente</p>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl text-[#FF2D55]">
                <Sparkles size={18} />
              </div>
            </button>

            <div className="w-full flex items-center gap-4 my-2">
              <div className="h-[1px] flex-1 bg-white/10" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ou selecione manualmente</span>
              <div className="h-[1px] flex-1 bg-white/10" />
            </div>

            <h1 className="text-4xl font-black uppercase tracking-tighter">1. Selecionar Cliente</h1>

            {!showQuickClient ? (
              <>
                <div className="relative bg-zinc-950 p-1.5 rounded-2xl border border-white/10 w-full">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Buscar cliente por nome ou telefone..."
                    className="w-full bg-transparent border-none py-4 pl-14 pr-6 text-white font-bold text-xs outline-none placeholder-zinc-600"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 w-full">
                  {clients
                    .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.phone || '').includes(clientSearch))
                    .slice(0, 6)
                    .map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedClient(c); setStep('VEICULO'); }}
                        className="w-full p-5 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-between hover:border-[#FF2D55]/50 transition-all group cursor-pointer"
                      >
                        <div className="text-left">
                          <p className="text-base font-black uppercase group-hover:text-[#FF2D55]">{c.name}</p>
                          <p className="text-[11px] font-bold text-zinc-500 mt-1">{c.phone}</p>
                        </div>
                        <User size={22} className="text-zinc-600" />
                      </button>
                    ))}
                  <button
                    onClick={() => setShowQuickClient(true)}
                    className="w-full p-6 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <Plus className="text-[#FF2D55]" size={22} />
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Cadastrar Novo Cliente</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full bg-zinc-950 p-8 rounded-3xl border border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase">Cadastro Rápido de Cliente</h3>
                  <button onClick={() => setShowQuickClient(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X /></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome do Cliente</label>
                    <input
                      type="text"
                      value={quickClient.name}
                      onChange={(e) => setQuickClient({ ...quickClient, name: e.target.value })}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-[#FF2D55] uppercase"
                      placeholder="EX: JOÃO DA SILVA"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={quickClient.phone}
                      onChange={(e) => setQuickClient({ ...quickClient, phone: e.target.value })}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-[#FF2D55]"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <button onClick={handleCreateQuickClient} className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest cursor-pointer">
                    Salvar e Continuar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'VEICULO' && selectedClient && (
          <div className="w-full max-w-2xl space-y-8 animate-in slide-in-from-right-6 duration-500 flex flex-col items-center">
            <h1 className="text-4xl font-black uppercase tracking-tighter">2. Selecionar Veículo</h1>

            {!showQuickVehicle ? (
              <div className="grid grid-cols-1 gap-4 w-full">
                {vehicles.filter(v => v.clientId === selectedClient.id).map(v => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVehicle(v);
                      setNoteKm(v.km !== undefined && v.km !== null ? v.km.toString() : '');
                      setStep('ITENS');
                    }}
                    className="p-6 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-between hover:border-[#FF2D55]/50 transition-all group cursor-pointer"
                  >
                    <div className="text-left">
                      <p className="text-2xl font-black uppercase text-white font-mono">{v.plate}</p>
                      <p className="text-xs font-bold text-zinc-400 uppercase mt-1">
                        {v.model} • <span className="text-zinc-300 font-mono">{(v.km || 0).toLocaleString('pt-BR')} KM</span>
                      </p>
                    </div>
                    <Car size={32} className="text-zinc-700 group-hover:text-[#FF2D55]" />
                  </button>
                ))}
                <button
                  onClick={() => setShowQuickVehicle(true)}
                  className="w-full p-6 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/5 transition-all cursor-pointer"
                >
                  <Plus className="text-[#FF2D55]" size={22} />
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Cadastrar Novo Veículo</span>
                </button>
              </div>
            ) : (
              <div className="w-full bg-zinc-950 p-8 rounded-3xl border border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase">Novo Veículo para {selectedClient.name}</h3>
                  <button onClick={() => setShowQuickVehicle(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X /></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Placa</label>
                    <input
                      type="text"
                      value={quickVehicle.plate}
                      onChange={(e) => setQuickVehicle({ ...quickVehicle, plate: e.target.value })}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-black outline-none focus:border-[#FF2D55] uppercase font-mono"
                      placeholder="ABC1D23"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Modelo / Ano</label>
                    <input
                      type="text"
                      value={quickVehicle.model}
                      onChange={(e) => setQuickVehicle({ ...quickVehicle, model: e.target.value })}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-[#FF2D55] uppercase"
                      placeholder="EX: HONDA CIVIC TOURING 2022"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">KM Atual</label>
                    <input
                      type="number"
                      value={quickVehicle.km}
                      onChange={(e) => setQuickVehicle({ ...quickVehicle, km: e.target.value })}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-mono font-bold outline-none focus:border-[#FF2D55]"
                      placeholder="45000"
                    />
                  </div>
                  <button onClick={handleCreateQuickVehicle} className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest cursor-pointer">
                    Vincular e Continuar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'ITENS' && selectedVehicle && (
          <div className="w-full max-w-3xl space-y-8 animate-in slide-in-from-right-6 duration-500">
            <div className="bg-zinc-950 p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 w-full shadow-2xl">
              {/* Vehicle Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-[#FF2D55]/10 rounded-xl flex items-center justify-center text-[#FF2D55] shrink-0">
                    <Car size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase text-white font-mono leading-none">{selectedVehicle.plate}</h3>
                    <p className="text-xs font-bold text-zinc-400 uppercase mt-1">{selectedVehicle.model} • {selectedClient?.name}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowPartSearch(true)}
                    className="px-4 py-2.5 bg-zinc-900 border border-white/10 text-zinc-200 rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-[#FF2D55] transition-all cursor-pointer"
                  >
                    + Peça do Estoque
                  </button>
                  <button
                    onClick={() => setItems([...items, { id: `it-${Date.now()}`, description: '', quantity: 1, unitPrice: 0, type: 'SERVICE' }])}
                    className="px-4 py-2.5 bg-[#FF2D55] text-white rounded-xl font-black uppercase text-[10px] tracking-widest cursor-pointer"
                  >
                    + Novo Serviço/Item
                  </button>
                </div>
              </div>

              {/* Box, KM, Target Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={12} className="text-[#FF2D55]" /> Box / Elevador
                  </label>
                  <select
                    value={selectedBox}
                    onChange={(e) => setSelectedBox(e.target.value)}
                    className="w-full bg-black border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
                  >
                    <option value="">Pátio (A definir)</option>
                    {boxes.map(b => (
                      <option key={b.id} value={b.code}>
                        {b.code} — {b.name} ({b.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">KM Entrada</label>
                  <input
                    type="number"
                    min="0"
                    value={noteKm}
                    onChange={(e) => setNoteKm(e.target.value)}
                    placeholder={selectedVehicle.km?.toString() || '0'}
                    className="w-full bg-black border border-white/10 p-3 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-[#FF2D55]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Tipo de Abertura</label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as OSStatus)}
                    className="w-full bg-black border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-[#FF2D55]"
                  >
                    <option value={OSStatus.EM_DIAGNOSTICO}>Em Diagnóstico</option>
                    <option value={OSStatus.AGUARDANDO_APROVACAO}>Orçamento (Aguard. Aprovação)</option>
                    <option value={OSStatus.EM_SERVICO}>OS Autorizada (Em Serviço)</option>
                    <option value={OSStatus.FINALIZACAO}>Para Inspeção Final</option>
                    <option value={OSStatus.PRONTO}>Pronto p/ Entrega</option>
                  </select>
                </div>
              </div>

              {/* Mechanics multi-select */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={12} className="text-[#FF2D55]" /> Mecânicos Responsáveis
                </label>
                <div className="flex flex-wrap gap-2">
                  {mechanicPool.map(name => {
                    const active = selectedMechanics.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() =>
                          setSelectedMechanics(prev =>
                            prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          active ? 'bg-[#FF2D55] text-white border-[#FF2D55]' : 'bg-black text-zinc-400 border-white/10'
                        }`}
                      >
                        {active ? '✓ ' : ''}{name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Problem / Diagnostic notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench size={12} className="text-[#FF2D55]" /> Queixa do Cliente / Diagnóstico Inicial
                </label>
                <textarea
                  rows={2}
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="Ex: Barulho na suspensão dianteira, revisão de 60.000 km, troca de óleo e filtros..."
                  className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-xs text-white outline-none focus:border-[#FF2D55]"
                />
              </div>

              {/* Part Search Drawer */}
              {showPartSearch && (
                <div className="bg-zinc-900 p-5 rounded-2xl border border-[#FF2D55]/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#FF2D55]">Catálogo de Peças em Estoque</h4>
                    <button onClick={() => setShowPartSearch(false)} className="cursor-pointer"><X size={18} /></button>
                  </div>
                  <input
                    type="text"
                    value={partSearch}
                    onChange={(e) => setPartSearch(e.target.value)}
                    placeholder="Buscar peça por nome ou código..."
                    className="w-full bg-black border border-white/10 p-3 rounded-xl text-white font-bold text-xs outline-none"
                  />
                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                    {parts
                      .filter(p => p.name.toLowerCase().includes(partSearch.toLowerCase()) || (p.sku || '').toLowerCase().includes(partSearch.toLowerCase()))
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleAddPartFromInventory(p)}
                          className="flex items-center justify-between p-3 bg-black/60 rounded-xl hover:bg-black border border-white/5 hover:border-white/20 cursor-pointer"
                        >
                          <div className="text-left">
                            <span className="text-xs font-black uppercase block">{p.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">SKU: {p.sku} • Estoque: {p.stock}</span>
                          </div>
                          <span className="text-xs font-mono font-black text-[#FF2D55]">R$ {p.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="bg-black/60 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row gap-3 items-center">
                    <select
                      value={item.type}
                      onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, type: e.target.value as 'PART' | 'SERVICE' } : i))}
                      className="bg-zinc-900 border border-white/10 px-3 py-2.5 rounded-xl text-xs font-bold text-white outline-none w-full sm:w-28"
                    >
                      <option value="SERVICE">Serviço</option>
                      <option value="PART">Peça</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Descrição do item..."
                      value={item.description}
                      onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, description: e.target.value.toUpperCase() } : i))}
                      className="flex-1 w-full bg-transparent text-xs font-bold outline-none uppercase text-white"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="number"
                        placeholder="Qtd"
                        value={item.quantity || ''}
                        onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, quantity: parseFloat(e.target.value) || 0 } : i))}
                        className="w-16 bg-white/5 border border-white/10 p-2.5 rounded-xl text-center text-xs font-mono font-bold text-white outline-none"
                      />
                      <input
                        type="number"
                        placeholder="R$ Unit"
                        value={item.unitPrice || ''}
                        onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, unitPrice: parseFloat(e.target.value) || 0 } : i))}
                        className="w-28 bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs font-mono font-bold text-white outline-none"
                      />
                      <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-2 text-zinc-500 hover:text-red-400 cursor-pointer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="pt-5 border-t border-white/10 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between bg-black/50 p-3.5 rounded-xl border border-white/10">
                    <label className="text-[10px] font-black text-zinc-400 uppercase">Mão de Obra Geral (R$)</label>
                    <input
                      type="number"
                      value={labor}
                      onChange={(e) => setLabor(e.target.value)}
                      className="bg-zinc-900 border border-white/10 p-2 rounded-lg text-right text-white font-mono font-bold w-28 outline-none focus:border-[#FF2D55]"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-black/50 p-3.5 rounded-xl border border-white/10">
                    <label className="text-[10px] font-black text-zinc-400 uppercase">Desconto (R$)</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="bg-zinc-900 border border-white/10 p-2 rounded-lg text-right text-emerald-400 font-mono font-bold w-28 outline-none focus:border-[#FF2D55]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-white uppercase tracking-widest">Total da Ordem de Serviço</p>
                  <p className="text-3xl font-black text-[#FF2D55] font-mono tabular-nums">
                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <button
                onClick={handleFinalize}
                disabled={isSaving}
                className="w-full bg-[#FF2D55] hover:bg-[#e02448] py-5 rounded-2xl font-black uppercase text-xs tracking-[0.25em] flex items-center justify-center gap-3 active:scale-95 transition-all cursor-pointer shadow-xl shadow-[#FF2D55]/30"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : 'Confirmar e Registrar OS'}
              </button>
            </div>
          </div>
        )}

        {step === 'FINAL' && finalOs && (
          <div className="w-full flex flex-col items-center gap-10 animate-in fade-in duration-500">
            <div className="invoice-preview-wrapper">
              <div className="invoice-container-scaled">
                <div ref={previewRef}><Invoice os={finalOs} tenant={tenant} /></div>
              </div>
            </div>
            <div className="w-full max-w-[500px] flex flex-col gap-3 px-4 pb-16">
              <button
                onClick={downloadImage}
                disabled={isSaving}
                className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <ImageIcon size={20} />} Salvar Comprovante em PNG
              </button>
              <button
                onClick={() => navigate('/orders')}
                className="bg-zinc-900 border border-white/10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center hover:bg-zinc-800 cursor-pointer"
              >
                Ir para Histórico de OS
              </button>
            </div>
          </div>
        )}
      </div>

      {showPatioModal && (
        <PatioCheckinModal
          isOpen={showPatioModal}
          onClose={() => setShowPatioModal(false)}
          session={session}
          syncData={syncData}
          onSuccess={() => {
            setShowPatioModal(false);
            navigate('/patio');
          }}
        />
      )}
    </div>
  );
};

export default NewServiceOrder;
