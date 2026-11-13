import React, { useState, useRef, useMemo } from 'react';
import { 
  Camera, Check, X, ArrowRight, ArrowLeft, Cloud, Car, 
  User, CheckCircle2, AlertTriangle, Plus, Search, Trash2, 
  Sparkles, Wrench, ShieldCheck, Fuel, Phone, FileText, Image as ImageIcon
} from 'lucide-react';
import { Client, Vehicle, Part, ServiceOrder, OSStatus, PaymentStatus, ProofPhoto, UserSession } from '../types';
import { lookupVehicleByPlate } from '../src/utils/plateLookup';
import {
  readWorkshopData,
  writeWorkshopData,
  createDefaultPatioCategories,
  createOSTimelineEvent,
  appendAuditLog
} from '../src/utils/workshopHelpers';

interface PatioCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: UserSession;
  clients?: Client[];
  vehicles?: Vehicle[];
  parts?: Part[];
  syncData?: (key: string, data: any) => Promise<void>;
  onSuccess?: (os: ServiceOrder) => void;
}

export const PatioCheckinModal: React.FC<PatioCheckinModalProps> = ({
  isOpen,
  onClose,
  session,
  clients: propClients,
  vehicles: propVehicles,
  parts: propParts,
  syncData,
  onSuccess
}) => {
  const tenant = session?.username || 'rafael';

  // Fallback storage loader if not directly passed in props
  const clients: Client[] = useMemo<Client[]>(() => {
    if (propClients && propClients.length > 0) return propClients;
    return readWorkshopData<Client[]>(tenant, 'clients', []);
  }, [propClients, tenant]);

  const vehicles: Vehicle[] = useMemo<Vehicle[]>(() => {
    if (propVehicles && propVehicles.length > 0) return propVehicles;
    return readWorkshopData<Vehicle[]>(tenant, 'vehicles', []);
  }, [propVehicles, tenant]);

  const parts: Part[] = useMemo<Part[]>(() => {
    if (propParts && propParts.length > 0) return propParts;
    return readWorkshopData<Part[]>(tenant, 'parts', []);
  }, [propParts, tenant]);

  // Flow steps: 1 = PLACA/VEICULO, 2 = CLIENTE, 3 = SERVIÇO, 4 = CHECKLIST_FOTOS, 5 = PRODUTOS, 6 = SUCESSO
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Step 1: Plate & Vehicle
  const [plateInput, setPlateInput] = useState('');
  const [platePhotoUrl, setPlatePhotoUrl] = useState<string>('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleVin, setVehicleVin] = useState('');
  const [vehicleFuel, setVehicleFuel] = useState('Álcool / Gasolina');
  const [vehicleKm, setVehicleKm] = useState('');
  const [isPlateScanned, setIsPlateScanned] = useState(false);

  // Step 2: Client
  const [selectedClientId, setSelectedClientId] = useState<string>(() => clients[0]?.id || '');
  const [clientSearch, setClientSearch] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDoc, setNewClientDoc] = useState('');

  // Step 3: Requested Services
  const [serviceDescription, setServiceDescription] = useState('Revisão Geral e Balanceamento');
  const [laborEstimate, setLaborEstimate] = useState('60');

  // Step 4: Checklists with Photos (matching video)
  const [checklistIndex, setChecklistIndex] = useState<number>(0);
  const [checklistResponses, setChecklistResponses] = useState<{
    lightsWorking: boolean;
    lightsNote: string;
    lightsPhoto: string;
    suspensionNoise: boolean;
    suspensionNote: string;
    suspensionPhoto: string;
    tiresOk: boolean;
    tiresNote: string;
    tiresPhoto: string;
    fuelLevel: string;
  }>({
    lightsWorking: true,
    lightsNote: 'Faróis e lanternas funcionando perfeitamente',
    lightsPhoto: '',
    suspensionNoise: false,
    suspensionNote: 'Sem folgas na suspensão dianteira',
    suspensionPhoto: '',
    tiresOk: true,
    tiresNote: 'Pneus com boa profundidade de sulco',
    tiresPhoto: '',
    fuelLevel: '1/2'
  });

  // Checklist photo taking modal
  const [activePhotoQuestion, setActivePhotoQuestion] = useState<'lights' | 'suspension' | 'tires' | null>(null);
  const [tempPhotoUrl, setTempPhotoUrl] = useState('');
  const [tempPhotoNote, setTempPhotoNote] = useState('');

  // Step 5: Products / Parts (Optional)
  const [selectedParts, setSelectedParts] = useState<{ part: Part; quantity: number }[]>([]);
  const [partSearch, setPartSearch] = useState('');

  // Step 6: Cloud Syncing & Finished
  const [isSaving, setIsSaving] = useState(false);
  const [createdOs, setCreatedOs] = useState<ServiceOrder | null>(null);

  const [stepError, setStepError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const checklistPhotoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const persistField = async (key: string, data: any) => {
    writeWorkshopData(tenant, key, data);
    if (syncData) {
      await syncData(key, data);
    }
  };

  // Handle Plate Search / Auto-fill
  const handlePlateChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setPlateInput(clean);

    if (clean.length >= 6) {
      // Lookup in existing vehicles first
      const existing = vehicles.find(v => v.plate.replace(/[^A-Z0-9]/g, '').toUpperCase() === clean);
      if (existing) {
        setVehicleBrand(existing.brand || '---');
        setVehicleModel(existing.model || '');
        setVehicleKm(existing.km !== undefined && existing.km !== null ? existing.km.toString() : '');
        if (existing.year) setVehicleYear(existing.year);
        if (existing.color) setVehicleColor(existing.color);
        if (existing.fuel) setVehicleFuel(existing.fuel);
        if (existing.clientId) setSelectedClientId(existing.clientId);
        setIsPlateScanned(true);
      } else {
        const info = lookupVehicleByPlate(clean);
        setVehicleBrand(info.brand);
        setVehicleModel(info.model);
        setVehicleColor(info.color);
        setVehicleYear(info.year);
        setVehicleVin(info.vin);
        setVehicleFuel(info.fuel);
        setVehicleKm(info.km.toString());
        setIsPlateScanned(true);
      }
    }
  };

  // Handle Plate Photo Upload / Camera
  const handlePlatePhotoCaptured = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setPlatePhotoUrl(url);
        if (plateInput && plateInput.trim().length >= 6) {
          handlePlateChange(plateInput);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Checklist Photo Upload / Camera
  const handleChecklistPhotoCaptured = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activePhotoQuestion) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setTempPhotoUrl(url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChecklistPhoto = () => {
    if (!activePhotoQuestion) return;
    if (activePhotoQuestion === 'lights') {
      setChecklistResponses(prev => ({
        ...prev,
        lightsPhoto: tempPhotoUrl,
        lightsNote: tempPhotoNote || prev.lightsNote
      }));
    } else if (activePhotoQuestion === 'suspension') {
      setChecklistResponses(prev => ({
        ...prev,
        suspensionPhoto: tempPhotoUrl,
        suspensionNote: tempPhotoNote || prev.suspensionNote
      }));
    } else if (activePhotoQuestion === 'tires') {
      setChecklistResponses(prev => ({
        ...prev,
        tiresPhoto: tempPhotoUrl,
        tiresNote: tempPhotoNote || prev.tiresNote
      }));
    }
    setActivePhotoQuestion(null);
    setTempPhotoUrl('');
    setTempPhotoNote('');
  };

  // Save quick client
  const handleAddQuickClient = async () => {
    if (!newClientName || !newClientPhone) return;
    const newC: Client = {
      id: Math.random().toString(36).substr(2, 9),
      name: newClientName.toUpperCase(),
      phone: newClientPhone,
      document: newClientDoc || '---',
      observations: 'CADASTRADO NO PÁTIO',
      createdAt: new Date().toISOString()
    };
    const updatedClients = [...clients, newC];
    await persistField('clients', updatedClients);
    setSelectedClientId(newC.id);
    setShowNewClientForm(false);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientDoc('');
  };

  // Add Part
  const handleAddPart = (part: Part) => {
    const exists = selectedParts.find(p => p.part.id === part.id);
    if (exists) {
      setSelectedParts(selectedParts.map(p => p.part.id === part.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setSelectedParts([...selectedParts, { part, quantity: 1 }]);
    }
    setPartSearch('');
  };

  // Final OS Submission to Cloud
  const handleFinalizePatioOS = async () => {
    setIsSaving(true);

    try {
      // Find or create client
      let client = clients.find(c => c.id === selectedClientId);
      if (!client) {
        client = {
          id: Math.random().toString(36).substr(2, 9),
          name: 'CLIENTE PÁTIO',
          phone: '(11) 99999-9999',
          document: '---',
          observations: 'Atendimento Rápido no Pátio',
          createdAt: new Date().toISOString()
        };
        const updatedClients = [...clients, client];
        await persistField('clients', updatedClients);
      }

      // Find or create vehicle
      const cleanPlate = plateInput.replace(/[^A-Z0-9]/g, '').toUpperCase();
      const formattedPlate = cleanPlate.length >= 7
        ? `${cleanPlate.slice(0, 3)}-${cleanPlate.slice(3, 7)}`
        : cleanPlate || 'SEM-PLACA';

      const parsedKm = parseInt(String(vehicleKm).replace(/\D/g, ''), 10);
      const hasValidKm = String(vehicleKm).trim() !== '' && !isNaN(parsedKm) && parsedKm >= 0;
      const safeModel = vehicleModel.trim() || 'VEÍCULO EM ATENDIMENTO';

      let vehicle = vehicles.find(v => v.plate.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanPlate);
      if (!vehicle) {
        vehicle = {
          id: Math.random().toString(36).substr(2, 9),
          clientId: client.id,
          plate: formattedPlate,
          model: safeModel,
          brand: vehicleBrand || '---',
          year: vehicleYear || '---',
          color: vehicleColor || '---',
          fuel: vehicleFuel,
          km: hasValidKm ? parsedKm : 84000
        };
        const updatedVehicles = [...vehicles, vehicle];
        await persistField('vehicles', updatedVehicles);
      } else if (hasValidKm && parsedKm > 0 && parsedKm !== vehicle.km && (parsedKm >= (vehicle.km || 0) || !vehicle.km)) {
        const updatedVehicles = vehicles.map(v =>
          v.id === vehicle!.id ? { ...v, km: parsedKm } : v
        );
        await persistField('vehicles', updatedVehicles);
      }

      const finalKmStr = hasValidKm ? parsedKm.toString() : (vehicle.km !== undefined && vehicle.km !== null ? vehicle.km.toString() : '0');

      // Build items
      const osItems = selectedParts.map(sp => ({
        id: Math.random().toString(36).substr(2, 9),
        description: sp.part.name.toUpperCase(),
        quantity: sp.quantity,
        unitPrice: sp.part.salePrice,
        costPrice: sp.part.costPrice,
        partId: sp.part.id,
        type: 'PART' as const
      }));

      // Deduct parts stock from inventory
      if (selectedParts.length > 0 && parts.length > 0) {
        const updatedParts = parts.map(p => {
          const used = selectedParts.find(sp => sp.part.id === p.id);
          if (!used) return p;
          return { ...p, stock: Math.max(0, p.stock - used.quantity) };
        });
        await persistField('parts', updatedParts);
      }

      const laborVal = parseFloat(laborEstimate) || 0;
      const totalItemsVal = osItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
      const totalValue = totalItemsVal + laborVal;

      // Proof Photos list (Entry / Before)
      const proofPhotos: ProofPhoto[] = [];
      const timestamp = new Date().toISOString();

      if (platePhotoUrl) {
        proofPhotos.push({
          id: `ph-${Date.now()}-1`,
          type: 'ENTRY',
          label: `Foto de Entrada da Placa (${formattedPlate})`,
          url: platePhotoUrl,
          timestamp
        });
      }
      if (checklistResponses.lightsPhoto) {
        proofPhotos.push({
          id: `ph-${Date.now()}-2`,
          type: 'BEFORE',
          label: `Estado de Entrada: Faróis e Piscas (${checklistResponses.lightsNote || 'OK'})`,
          url: checklistResponses.lightsPhoto,
          timestamp
        });
      }
      if (checklistResponses.suspensionPhoto) {
        proofPhotos.push({
          id: `ph-${Date.now()}-3`,
          type: 'BEFORE',
          label: `Estado de Entrada: Suspensão (${checklistResponses.suspensionNote || 'OK'})`,
          url: checklistResponses.suspensionPhoto,
          timestamp
        });
      }
      if (checklistResponses.tiresPhoto) {
        proofPhotos.push({
          id: `ph-${Date.now()}-4`,
          type: 'BEFORE',
          label: `Estado de Entrada: Pneus/Rodas (${checklistResponses.tiresNote || 'OK'})`,
          url: checklistResponses.tiresPhoto,
          timestamp
        });
      }

      const categories = createDefaultPatioCategories();
      categories.vidros_farois = {
        ...categories.vidros_farois,
        status: checklistResponses.lightsWorking ? 'OK' : 'ATENCAO',
        notes: checklistResponses.lightsNote || ''
      };
      categories.pneus_rodas = {
        ...categories.pneus_rodas,
        status: checklistResponses.tiresOk ? 'OK' : 'ATENCAO',
        notes: checklistResponses.tiresNote || ''
      };
      categories.combustivel = {
        ...categories.combustivel,
        status: 'OK',
        notes: `Marcador na chegada: ${checklistResponses.fuelLevel}`
      };
      categories.observacoes_adicionais = {
        ...categories.observacoes_adicionais,
        status: checklistResponses.suspensionNoise ? 'ATENCAO' : 'OK',
        notes: checklistResponses.suspensionNote || ''
      };

      const osNumber = `${Math.floor(100000 + Math.random() * 899999)}`;
      const operatorName = session?.realUsername || session?.username || 'Recepção';
      const newOs: ServiceOrder = {
        id: `os-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        osNumber,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        vehicleId: vehicle.id,
        vehiclePlate: formattedPlate,
        vehicleModel: safeModel,
        vehicleKm: finalKmStr,
        receptionistName: operatorName,
        problem: serviceDescription ? serviceDescription.toUpperCase() : 'MANUTENÇÃO DE PÁTIO',
        items: osItems,
        laborValue: laborVal,
        discount: 0,
        totalValue,
        status: OSStatus.AGUARDANDO_DIAGNOSTICO,
        paymentStatus: PaymentStatus.PENDENTE,
        proofPhotos,
        photos: proofPhotos.map(p => ({ label: p.label, url: p.url })),
        timeline: [
          createOSTimelineEvent(
            'CHECKIN_PATIO',
            `Check-in de Pátio realizado (${formattedPlate} • KM ${finalKmStr})`,
            operatorName,
            session?.role
          )
        ],
        checklist: {
          fuelLevel: checklistResponses.fuelLevel,
          kmEntry: finalKmStr,
          damages: [],
          categories,
          items: {
            'Faróis e Lanternas': checklistResponses.lightsWorking,
            'Ruídos de Suspensão': checklistResponses.suspensionNoise,
            'Pneus e Rodas': checklistResponses.tiresOk
          },
          observations: `Recepção de Pátio Expressa. ${serviceDescription}. Anotação Faróis: ${checklistResponses.lightsNote}`,
          proofPhotos,
          photos: proofPhotos.map(p => ({ label: p.label, url: p.url }))
        },
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const currentOrders = readWorkshopData<ServiceOrder[]>(tenant, 'orders', []);
      const updatedOrders = [newOs, ...currentOrders];
      await persistField('orders', updatedOrders);
      appendAuditLog(tenant, operatorName, 'CHECKIN_PATIO', `OS #${osNumber}`, `${formattedPlate} • R$ ${totalValue.toFixed(2)}`);

      setCreatedOs(newOs);
      setCurrentStep(6);
      if (onSuccess) onSuccess(newOs);
    } catch (e) {
      console.error(e);
      setStepError("Erro ao gravar O.S. de Pátio. Verifique os dados e tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedClientObj = clients.find(c => c.id === selectedClientId);

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md sm:max-w-lg bg-[#0F0F10] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden text-left relative animate-in zoom-in-95 duration-200 my-auto">
        {/* Top bar header */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF2D55]/10 border border-[#FF2D55]/20 text-[#FF2D55] flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider text-white">
                RECEPÇÃO DE PÁTIO <span className="text-[#FF2D55]">EXPRESS</span>
              </h2>
              <p className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Check-in com Foto da Placa & Vistoria
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step progress pills */}
        <div className="px-5 py-2.5 bg-black/40 border-b border-white/5 flex items-center justify-between gap-1">
          {[
            { step: 1, label: 'Placa' },
            { step: 2, label: 'Cliente' },
            { step: 3, label: 'Serviço' },
            { step: 4, label: 'Vistoria' },
            { step: 5, label: 'Peças' },
            { step: 6, label: 'Gravar' }
          ].map(it => (
            <div 
              key={it.step} 
              className={`flex-1 text-center py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-colors
                ${currentStep === it.step ? 'bg-[#FF2D55] text-white' : currentStep > it.step ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-900 text-zinc-600'}`}
            >
              {it.label}
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[75vh] space-y-5">
          {/* ================= STEP 1: FOTO DA PLACA & LANÇAMENTO DO OBJETO ================= */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FF2D55]">Passo 1 de 5</span>
                <h3 className="text-base font-black uppercase italic tracking-tight text-white">Lançamento do Objeto (Veículo)</h3>
                <p className="text-[10px] text-zinc-400">Bata uma foto da placa ou digite para preencher os dados instantaneamente</p>
              </div>

              {/* Camera / Plate Photo Card */}
              <div className="p-4 bg-zinc-950 border border-white/10 rounded-2xl space-y-3 text-center">
                <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/5 aspect-video flex items-center justify-center group">
                  {platePhotoUrl ? (
                    <>
                      <img src={platePhotoUrl} alt="Placa do Veículo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-between p-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/30 w-fit">
                          ✓ Foto da Placa Capturada
                        </span>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="self-center py-2 px-4 bg-black/80 hover:bg-[#FF2D55] text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20 transition-all"
                        >
                          <Camera size={12} /> Trocar Foto
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-2 text-zinc-500 hover:text-white transition-colors"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-[#FF2D55] group-hover:scale-110 transition-transform">
                        <Camera size={26} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-white">BATER FOTO DA PLACA</span>
                      <span className="text-[8px] text-zinc-500">Câmera abre automaticamente no celular</span>
                    </button>
                  )}
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    onChange={handlePlatePhotoCaptured} 
                    className="hidden" 
                  />
                </div>

                {/* Plate Input with instant lookup */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block text-left">
                      Placa do Veículo:
                    </label>
                    <span className="text-[8px] text-zinc-500 font-bold">Padrão Mercosul / Cinza</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={plateInput} 
                      onChange={(e) => handlePlateChange(e.target.value)} 
                      placeholder="DIGITE A PLACA (EX: BRA-2E19)"
                      className="w-full bg-black border-2 border-[#FF2D55]/40 focus:border-[#FF2D55] rounded-xl py-3 px-4 text-center font-black text-lg text-white uppercase tracking-[0.25em] outline-none shadow-inner"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="text-[7.5px] text-zinc-500 font-bold uppercase">Exemplos rápidos:</span>
                    {['BAW6421', 'BRA2E19', 'ABC1234'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePlateChange(p)}
                        className="text-[8px] font-mono font-bold bg-white/5 hover:bg-[#FF2D55]/20 hover:border-[#FF2D55]/50 border border-white/10 px-2 py-0.5 rounded text-zinc-300 transition-all cursor-pointer"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vehicle Auto-filled Details Form (from video: Automóvel, VW, Modelo, Cor, Ano, Chassi, etc) */}
              {isPlateScanned && (
                <div className="p-4 bg-zinc-950/80 border border-emerald-500/30 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Dados Preenchidos Automaticamente
                    </span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">AUTOMÓVEL</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-left">
                    <div className="space-y-1">
                      <label className="text-[7.5px] font-bold text-zinc-500 uppercase">Marca</label>
                      <input 
                        type="text" 
                        value={vehicleBrand} 
                        onChange={(e) => setVehicleBrand(e.target.value)} 
                        className="w-full bg-black/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7.5px] font-bold text-zinc-500 uppercase">Modelo</label>
                      <input 
                        type="text" 
                        value={vehicleModel} 
                        onChange={(e) => setVehicleModel(e.target.value)} 
                        className="w-full bg-black/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7.5px] font-bold text-zinc-500 uppercase">Cor</label>
                      <input 
                        type="text" 
                        value={vehicleColor} 
                        onChange={(e) => setVehicleColor(e.target.value)} 
                        className="w-full bg-black/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7.5px] font-bold text-zinc-500 uppercase">Ano Fab/Mod</label>
                      <input 
                        type="text" 
                        value={vehicleYear} 
                        onChange={(e) => setVehicleYear(e.target.value)} 
                        className="w-full bg-black/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7.5px] font-bold text-zinc-500 uppercase">Combustível</label>
                      <input 
                        type="text" 
                        value={vehicleFuel} 
                        onChange={(e) => setVehicleFuel(e.target.value)} 
                        className="w-full bg-black/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7.5px] font-bold text-zinc-500 uppercase">Quilometragem (KM)</label>
                      <input 
                        type="text" 
                        value={vehicleKm} 
                        onChange={(e) => setVehicleKm(e.target.value)} 
                        className="w-full bg-black/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[7.5px] font-bold text-zinc-500 uppercase">Chassi / VIN</label>
                    <input 
                      type="text" 
                      value={vehicleVin} 
                      onChange={(e) => setVehicleVin(e.target.value)} 
                      className="w-full bg-black/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-400 font-mono font-bold uppercase"
                    />
                  </div>
                </div>
              )}

              {stepError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold text-center">
                  {stepError}
                </div>
              )}

              <button
                onClick={() => {
                  if (plateInput.trim().length < 4) {
                    setStepError('Informe a placa do veículo (mínimo 4 caracteres) para continuar.');
                    return;
                  }
                  setStepError(null);
                  setCurrentStep(2);
                }}
                className="w-full bg-[#FF2D55] hover:bg-[#ff1744] py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white flex items-center justify-center gap-2 shadow-lg shadow-[#FF2D55]/30 active:scale-95 transition-all cursor-pointer"
              >
                <span>Avançar para Cliente</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ================= STEP 2: SELECIONAR CLIENTE ================= */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FF2D55]">Passo 2 de 5</span>
                <h3 className="text-base font-black uppercase italic tracking-tight text-white">Selecione o Cliente</h3>
                <p className="text-[10px] text-zinc-400">Puxa automaticamente dados para contato e tabela de preço</p>
              </div>

              {!showNewClientForm ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input 
                      type="text" 
                      value={clientSearch} 
                      onChange={(e) => setClientSearch(e.target.value)} 
                      placeholder="BUSCAR CLIENTE POR NOME..." 
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-white uppercase outline-none focus:border-[#FF2D55]"
                    />
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {clients
                      .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch))
                      .slice(0, 6)
                      .map(c => {
                        const isSelected = selectedClientId === c.id;
                        return (
                          <div 
                            key={c.id} 
                            onClick={() => setSelectedClientId(c.id)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between
                              ${isSelected ? 'bg-zinc-900 border-[#FF2D55] text-white shadow-lg' : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/20'}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs
                                ${isSelected ? 'bg-[#FF2D55] text-white' : 'bg-white/5 text-zinc-400'}`}>
                                {c.name.slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black uppercase text-white truncate">{c.name}</p>
                                <p className="text-[9px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                  <Phone size={10} /> {c.phone}
                                </p>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 size={16} className="text-[#FF2D55] shrink-0" />}
                          </div>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setShowNewClientForm(true)}
                    className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 border border-dashed border-white/10 hover:border-white/25 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus size={14} className="text-[#FF2D55]" /> CADASTRAR NOVO CLIENTE
                  </button>
                </>
              ) : (
                <div className="p-4 bg-zinc-950 border border-white/10 rounded-2xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white">Cadastro Rápido de Cliente</span>
                    <button onClick={() => setShowNewClientForm(false)} className="text-zinc-500 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-2 text-left">
                    <div>
                      <label className="text-[8px] font-bold text-zinc-500 uppercase">Nome Completo</label>
                      <input 
                        type="text" 
                        value={newClientName} 
                        onChange={(e) => setNewClientName(e.target.value)} 
                        placeholder="EX: DUDU"
                        className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs text-white uppercase font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] font-bold text-zinc-500 uppercase">WhatsApp</label>
                        <input 
                          type="text" 
                          value={newClientPhone} 
                          onChange={(e) => setNewClientPhone(e.target.value)} 
                          placeholder="(11) 99999-9999"
                          className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-zinc-500 uppercase">CPF / CNPJ</label>
                        <input 
                          type="text" 
                          value={newClientDoc} 
                          onChange={(e) => setNewClientDoc(e.target.value)} 
                          placeholder="000.000.000-00"
                          className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs text-white font-bold"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddQuickClient}
                      className="w-full py-2.5 bg-[#FF2D55] text-white rounded-xl text-xs font-black uppercase tracking-wider"
                    >
                      Salvar e Selecionar
                    </button>
                  </div>
                </div>
              )}

              {/* Selected client summary & price list like in video */}
              {selectedClientObj && (
                <div className="p-3.5 bg-zinc-950/80 border border-white/5 rounded-xl space-y-1.5 text-left">
                  <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400">
                    <span>DADOS PARA CONTATO:</span>
                    <span className="text-[#FF2D55] font-black uppercase">TABELA 1 - NORMAL</span>
                  </div>
                  <p className="text-xs font-black uppercase text-white">{selectedClientObj.name}</p>
                  <p className="text-[10px] text-zinc-500">{selectedClientObj.phone} • Doc: {selectedClientObj.document || '---'}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="w-1/3 py-3.5 bg-zinc-950 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 bg-[#FF2D55] hover:bg-[#ff1744] py-3.5 rounded-xl font-black uppercase text-xs tracking-widest text-white flex items-center justify-center gap-2 shadow-lg shadow-[#FF2D55]/30 active:scale-95 transition-all"
                >
                  <span>Serviços Solicitados</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SERVIÇOS A EXECUTAR ================= */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FF2D55]">Passo 3 de 5</span>
                <h3 className="text-base font-black uppercase italic tracking-tight text-white">Serviços a Executar</h3>
                <p className="text-[10px] text-zinc-400">Descreva o serviço que o cliente solicitou na chegada</p>
              </div>

              <div className="space-y-3 text-left">
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">
                  Descreva os serviços solicitados:
                </label>
                <textarea 
                  rows={3}
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Ex: balanceamento, revisão de freio, troca de óleo..."
                  className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-[#FF2D55]"
                />

                {/* Quick Service Tags (Click to insert) */}
                <div className="space-y-1.5">
                  <label className="text-[7.5px] font-bold text-zinc-500 uppercase">Sugestões Rápidas:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'balanceamento', 
                      'alinhamento 3D', 
                      'revisão periódica', 
                      'troca de óleo e filtros', 
                      'pastilhas de freio', 
                      'ruído na suspensão'
                    ].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setServiceDescription(prev => prev ? `${prev}, ${tag}` : tag)}
                        className="py-1 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-[9px] font-bold uppercase text-zinc-400 hover:text-white transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-white/5 rounded-xl space-y-1">
                  <label className="text-[8px] font-black text-zinc-500 uppercase">Estimativa de Mão de Obra (R$)</label>
                  <input 
                    type="number" 
                    value={laborEstimate}
                    onChange={(e) => setLaborEstimate(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-sm font-black text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-1/3 py-3.5 bg-zinc-950 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 bg-[#FF2D55] hover:bg-[#ff1744] py-3.5 rounded-xl font-black uppercase text-xs tracking-widest text-white flex items-center justify-center gap-2 shadow-lg shadow-[#FF2D55]/30 active:scale-95 transition-all"
                >
                  <span>Ir para Vistoria com Fotos</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: CHECKLIST COM FOTOS DE CHEGADA (ANTES DA NOTA) ================= */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FF2D55]">Passo 4 de 5 • Antes da Nota</span>
                <h3 className="text-base font-black uppercase italic tracking-tight text-white">Vistoria & Checklist de Pátio</h3>
                <p className="text-[10px] text-zinc-400">Tire fotos do estado em que o veículo chegou e registre o evento</p>
              </div>

              {/* Sub-item 1: FAROIS E LANTERNAS (Idêntico ao vídeo!) */}
              <div className="p-4 bg-zinc-950 border border-white/10 rounded-2xl space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#FF2D55]">Checklist (1/3)</span>
                  {checklistResponses.lightsPhoto && (
                    <span className="text-[8px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                      <CheckCircle2 size={10} /> Foto Anexada
                    </span>
                  )}
                </div>
                <p className="text-xs font-black uppercase text-white leading-relaxed">
                  * FARÓIS, LANTERNAS E PISCAS ESTÃO FUNCIONANDO?
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChecklistResponses(prev => ({ ...prev, lightsWorking: true }))}
                    className={`py-2.5 rounded-xl border text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5
                      ${checklistResponses.lightsWorking ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black border-white/10 text-zinc-500'}`}
                  >
                    <Check size={14} /> Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setChecklistResponses(prev => ({ ...prev, lightsWorking: false }))}
                    className={`py-2.5 rounded-xl border text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5
                      ${!checklistResponses.lightsWorking ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-black border-white/10 text-zinc-500'}`}
                  >
                    <X size={14} /> Não
                  </button>
                </div>

                {/* Photo & Note Event for Lights */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  {checklistResponses.lightsPhoto ? (
                    <div className="flex items-center gap-3">
                      <img src={checklistResponses.lightsPhoto} alt="Faróis" className="w-12 h-12 object-cover rounded-xl border border-white/10" />
                      <div>
                        <p className="text-[9px] font-bold text-zinc-300">{checklistResponses.lightsNote || 'Foto do Farol Salva'}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setActivePhotoQuestion('lights');
                            setTempPhotoUrl(checklistResponses.lightsPhoto);
                            setTempPhotoNote(checklistResponses.lightsNote);
                          }}
                          className="text-[8px] text-[#FF2D55] font-black uppercase hover:underline"
                        >
                          Alterar Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActivePhotoQuestion('lights');
                        setTempPhotoUrl('');
                        setTempPhotoNote('Farol e piscas em funcionamento');
                      }}
                      className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-850 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-wider text-zinc-300 flex items-center justify-center gap-2"
                    >
                      <Camera size={14} className="text-[#FF2D55]" />
                      Adicionar Foto dos Faróis / Estado Chegado
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-item 2: SUSPENSÃO E RUÍDOS (Do vídeo!) */}
              <div className="p-4 bg-zinc-950 border border-white/10 rounded-2xl space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#FF2D55]">Checklist (2/3)</span>
                  {checklistResponses.suspensionPhoto && (
                    <span className="text-[8px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                      <CheckCircle2 size={10} /> Foto Anexada
                    </span>
                  )}
                </div>
                <p className="text-xs font-black uppercase text-white leading-relaxed">
                  * HÁ RUÍDOS OU FOLGAS ANORMAIS NA SUSPENSÃO?
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChecklistResponses(prev => ({ ...prev, suspensionNoise: true }))}
                    className={`py-2.5 rounded-xl border text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5
                      ${checklistResponses.suspensionNoise ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-black border-white/10 text-zinc-500'}`}
                  >
                    Sim (Há ruído)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChecklistResponses(prev => ({ ...prev, suspensionNoise: false }))}
                    className={`py-2.5 rounded-xl border text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5
                      ${!checklistResponses.suspensionNoise ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black border-white/10 text-zinc-500'}`}
                  >
                    Não (Sem ruído)
                  </button>
                </div>

                <div className="pt-2 border-t border-white/5">
                  {checklistResponses.suspensionPhoto ? (
                    <div className="flex items-center gap-3">
                      <img src={checklistResponses.suspensionPhoto} alt="Suspensão" className="w-12 h-12 object-cover rounded-xl border border-white/10" />
                      <div>
                        <p className="text-[9px] font-bold text-zinc-300">{checklistResponses.suspensionNote || 'Foto da Suspensão'}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setActivePhotoQuestion('suspension');
                            setTempPhotoUrl(checklistResponses.suspensionPhoto);
                            setTempPhotoNote(checklistResponses.suspensionNote);
                          }}
                          className="text-[8px] text-[#FF2D55] font-black uppercase hover:underline"
                        >
                          Alterar Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActivePhotoQuestion('suspension');
                        setTempPhotoUrl('');
                        setTempPhotoNote('Sem folgas anormais na suspensão');
                      }}
                      className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-850 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-wider text-zinc-300 flex items-center justify-center gap-2"
                    >
                      <Camera size={14} className="text-[#FF2D55]" />
                      Adicionar Foto da Suspensão
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-item 3: Nível de Combustível */}
              <div className="p-3.5 bg-zinc-950 border border-white/5 rounded-xl space-y-2 text-left">
                <label className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1.5">
                  <Fuel size={12} className="text-[#FF2D55]" /> NÍVEL DE COMBUSTÍVEL NA CHEGADA
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['Reserva', '1/4', '1/2', 'Cheio'].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setChecklistResponses(prev => ({ ...prev, fuelLevel: lvl }))}
                      className={`py-2 rounded-lg text-[9px] font-black uppercase border transition-all
                        ${checklistResponses.fuelLevel === lvl ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-white/5'}`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="w-1/3 py-3.5 bg-zinc-950 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="flex-1 bg-[#FF2D55] hover:bg-[#ff1744] py-3.5 rounded-xl font-black uppercase text-xs tracking-widest text-white flex items-center justify-center gap-2 shadow-lg shadow-[#FF2D55]/30 active:scale-95 transition-all"
                >
                  <span>Adicionar Peças / Concluir</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 5: PRODUTOS / PEÇAS (OPCIONAL) ================= */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FF2D55]">Passo 5 de 5</span>
                <h3 className="text-base font-black uppercase italic tracking-tight text-white">Peças e Produtos</h3>
                <p className="text-[10px] text-zinc-400">Caso tenha colocado algum produto na ordem de serviço, adicione aqui</p>
              </div>

              {/* Search Part */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input 
                  type="text" 
                  value={partSearch} 
                  onChange={(e) => setPartSearch(e.target.value)} 
                  placeholder="BUSCAR PEÇA OU CÓDIGO DE BARRAS..." 
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-white uppercase outline-none focus:border-[#FF2D55]"
                />
              </div>

              {partSearch && (
                <div className="p-2 bg-zinc-950 border border-white/10 rounded-xl max-h-40 overflow-y-auto space-y-1">
                  {parts
                    .filter(p => p.name.toLowerCase().includes(partSearch.toLowerCase()) || p.sku.toLowerCase().includes(partSearch.toLowerCase()))
                    .slice(0, 5)
                    .map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => handleAddPart(p)}
                        className="p-2.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between cursor-pointer text-left"
                      >
                        <div>
                          <p className="text-xs font-bold text-white uppercase">{p.name}</p>
                          <p className="text-[9px] text-zinc-500">SKU: {p.sku} • Estoque: {p.stock}</p>
                        </div>
                        <span className="text-xs font-black text-[#FF2D55]">R$ {p.salePrice.toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              )}

              {/* Selected Parts List */}
              <div className="space-y-2 text-left">
                <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Produtos Adicionados na OS:</span>
                {selectedParts.length === 0 ? (
                  <div className="p-6 bg-zinc-950/60 border border-dashed border-white/10 rounded-2xl text-center">
                    <p className="text-xs text-zinc-500 font-bold uppercase">Nenhum produto inserido</p>
                    <p className="text-[8px] text-zinc-600 mt-1">Você pode gravar apenas com o serviço de mão de obra (ex: balanceamento)</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedParts.map(({ part, quantity }) => (
                      <div key={part.id} className="p-3 bg-zinc-950 border border-white/10 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white uppercase">{part.name}</p>
                          <p className="text-[9px] text-zinc-500">{quantity}x • R$ {part.salePrice.toFixed(2)} cada</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-white">R$ {(quantity * part.salePrice).toFixed(2)}</span>
                          <button 
                            type="button" 
                            onClick={() => setSelectedParts(selectedParts.filter(p => p.part.id !== part.id))}
                            className="text-zinc-600 hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Final Summary Card before cloud save */}
              <div className="p-4 bg-zinc-950 border border-white/10 rounded-2xl text-left space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
                  <span>Veículo:</span>
                  <span className="text-white uppercase font-black">{plateInput} ({vehicleModel})</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
                  <span>Cliente:</span>
                  <span className="text-white uppercase font-black">{selectedClientObj?.name || '---'}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
                  <span>Serviço:</span>
                  <span className="text-[#FF2D55] uppercase font-black">{serviceDescription}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-zinc-400 border-t border-white/5 pt-2">
                  <span>Mão de Obra + Peças:</span>
                  <span className="text-emerald-400 font-black text-sm">
                    R$ {((parseFloat(laborEstimate) || 0) + selectedParts.reduce((acc, curr) => acc + (curr.quantity * curr.part.salePrice), 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="w-1/3 py-4 bg-zinc-950 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
                <button
                  onClick={handleFinalizePatioOS}
                  disabled={isSaving}
                  className="flex-1 bg-[#FF2D55] hover:bg-[#ff1744] py-4 rounded-xl font-black uppercase text-xs tracking-widest text-white flex items-center justify-center gap-2 shadow-lg shadow-[#FF2D55]/30 active:scale-95 transition-all"
                >
                  <Cloud size={16} className={isSaving ? 'animate-bounce' : ''} />
                  <span>{isSaving ? 'GRAVANDO NA NUVEM...' : 'GRAVAR ESTA O.S.'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 6: SUCESSO & NUVEM ================= */}
          {currentStep === 6 && createdOs && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-300 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">O.S. GRAVADA COM SUCESSO</span>
                <h3 className="text-2xl font-black uppercase italic tracking-tight text-white">OS #{createdOs.osNumber}</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase">{createdOs.vehiclePlate} • {createdOs.vehicleModel}</p>
              </div>

              <div className="p-4 bg-zinc-950 border border-white/10 rounded-2xl text-left space-y-2 text-xs">
                <p className="text-zinc-400"><strong className="text-white">Cliente:</strong> {createdOs.clientName}</p>
                <p className="text-zinc-400"><strong className="text-white">Serviço:</strong> {createdOs.problem}</p>
                <p className="text-zinc-400"><strong className="text-white">Vistoria de Entrada:</strong> {createdOs.proofPhotos?.length || 0} fotos registradas na recepção</p>
                <p className="text-zinc-400"><strong className="text-white">Total:</strong> R$ {createdOs.totalValue.toFixed(2)}</p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={onClose}
                  className="w-full bg-[#FF2D55] hover:bg-[#ff1744] py-4 rounded-xl font-black uppercase text-xs tracking-widest text-white shadow-lg active:scale-95 transition-all"
                >
                  Concluir e Voltar ao Sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Checklist Photo Capture Sub-Modal (When user clicks to photograph headlights/suspension) */}
      {activePhotoQuestion && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-6 space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase italic text-white flex items-center gap-2">
                <Camera size={14} className="text-[#FF2D55]" />
                Registrar Evento / Foto de Chegada
              </h3>
              <button onClick={() => setActivePhotoQuestion(null)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="aspect-video bg-black rounded-2xl border border-white/10 overflow-hidden relative flex items-center justify-center">
              {tempPhotoUrl ? (
                <>
                  <img src={tempPhotoUrl} alt="Foto Capturada" className="w-full h-full object-cover" />
                  <button
                    onClick={() => checklistPhotoInputRef.current?.click()}
                    className="absolute bottom-2 right-2 py-1 px-3 bg-black/80 rounded-lg text-[8px] font-black uppercase text-white border border-white/20"
                  >
                    Tirar Outra
                  </button>
                </>
              ) : (
                <button
                  onClick={() => checklistPhotoInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-zinc-500 hover:text-white"
                >
                  <Camera size={24} className="text-[#FF2D55]" />
                  <span className="text-[10px] font-bold uppercase text-white">BATER FOTO DO EVENTO</span>
                </button>
              )}
              <input 
                ref={checklistPhotoInputRef}
                type="file" 
                accept="image/*" 
                capture="environment" 
                onChange={handleChecklistPhotoCaptured} 
                className="hidden" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-bold text-zinc-500 uppercase">Anotação do Evento</label>
              <input 
                type="text" 
                value={tempPhotoNote}
                onChange={(e) => setTempPhotoNote(e.target.value)}
                placeholder="Ex: funcionando, farol trincado..."
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white font-bold"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setActivePhotoQuestion(null)}
                className="w-1/2 py-3 bg-zinc-900 rounded-xl text-[9px] font-black uppercase text-zinc-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveChecklistPhoto}
                className="w-1/2 py-3 bg-[#FF2D55] text-white rounded-xl text-[9px] font-black uppercase tracking-wider"
              >
                Confirmar Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatioCheckinModal;
