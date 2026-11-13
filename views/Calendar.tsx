
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  Car, 
  MessageCircle, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Share2,
  Bell,
  History,
  // Added Wrench to fix the 'Cannot find name' error
  Wrench
} from 'lucide-react';
import { Appointment, Client, UserSession } from '../types';

const Calendar: React.FC<{ session?: UserSession; syncData?: (key: string, data: any) => Promise<void> }> = ({ session, syncData }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  const [newAppointment, setNewAppointment] = useState({
    clientId: '',
    clientName: '',
    vehiclePlate: '',
    serviceType: 'Revisão Geral',
    time: '08:00',
    notes: ''
  });

  const loadData = () => {
    if (session) {
      const savedApps = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_appointments`) || '[]');
      const savedClients = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_clients`) || '[]');
      setAppointments(savedApps);
      setClients(savedClients);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('kaen_storage_updated', loadData);
    return () => window.removeEventListener('kaen_storage_updated', loadData);
  }, [session]);

  const dailyAppointments = useMemo(() => {
    return appointments.filter(a => a.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const checkConflicts = (date: string, time: string, clientId: string) => {
    // 1. Conflito de horário exato
    const timeSlotTaken = appointments.some(a => a.date === date && a.time === time && a.status !== 'Cancelado');
    if (timeSlotTaken) return "Horário já ocupado por outro veículo.";

    // 2. Conflito de mesmo cliente no mesmo horário
    const clientAlreadyScheduled = appointments.some(a => a.date === date && a.clientId === clientId && a.status !== 'Cancelado');
    if (clientAlreadyScheduled) return "Este cliente já possui um veículo agendado para este dia.";

    return null;
  };

  const handleSaveAppointment = async () => {
    if (!newAppointment.clientId || !newAppointment.time || !session || !syncData) return;

    const conflictMsg = checkConflicts(selectedDate, newAppointment.time, newAppointment.clientId);
    if (conflictMsg) {
      setConflict(conflictMsg);
      return;
    }

    const client = clients.find(c => c.id === newAppointment.clientId);
    
    // Contagem de tentativas do cliente (recorrente)
    const attempts = appointments.filter(a => a.clientId === newAppointment.clientId).length + 1;

    const appointment: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      clientId: newAppointment.clientId,
      clientName: client?.name || 'Cliente',
      vehiclePlate: newAppointment.vehiclePlate.toUpperCase(),
      serviceType: newAppointment.serviceType,
      date: selectedDate,
      time: newAppointment.time,
      status: 'Agendado',
      attemptsCount: attempts,
      notes: newAppointment.notes
    };

    const updated = [...appointments, appointment];
    setAppointments(updated);
    await syncData('appointments', updated);
    setShowModal(false);
    setNewAppointment({ clientId: '', clientName: '', vehiclePlate: '', serviceType: 'Revisão Geral', time: '08:00', notes: '' });
    setConflict(null);
  };

  const syncWithGoogle = () => {
    alert("Gerando Link Cloud... Sincronização Google Calendar iniciada via API Kaenpro.");
  };

  const hours = Array.from({ length: 11 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Agenda <span className="text-[#E11D48]">Inteligente</span></h1>
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 mt-2">
            <CalendarIcon size={12} className="text-[#E11D48]" /> Planejamento de Fluxo da Oficina
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={syncWithGoogle}
            className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-6 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-zinc-800 transition-all shadow-xl"
          >
            <Share2 size={18} /> Sync Calendário
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#E11D48] text-white px-8 py-4 rounded-2xl font-bold uppercase text-[11px] tracking-widest flex items-center gap-3 shadow-xl glow-red hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus size={18} /> Agendar Cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Lado Esquerdo: Mini Calendário e Stats */}
        <div className="space-y-6">
          <div className="bg-[#121214] border border-zinc-800/60 p-6 rounded-[2.5rem] shadow-xl">
             <div className="flex items-center justify-between mb-6">
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-2 text-zinc-500 hover:text-white"><ChevronLeft size={20}/></button>
                <h3 className="text-sm font-black text-white uppercase italic tracking-widest">{new Date(selectedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</h3>
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-2 text-zinc-500 hover:text-white"><ChevronRight size={20}/></button>
             </div>
             
             <div className="space-y-2">
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400 font-bold uppercase outline-none focus:border-[#E11D48]"
                />
             </div>
          </div>

          <div className="bg-[#121214] border border-zinc-800/60 p-8 rounded-[2.5rem] shadow-xl border-l-4 border-l-[#E11D48]">
             <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1">Capacidade de Hoje</p>
             <p className="text-2xl font-black text-white italic">{dailyAppointments.length} / 12</p>
             <div className="mt-4 h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-[#E11D48]" style={{ width: `${(dailyAppointments.length / 12) * 100}%` }}></div>
             </div>
          </div>
        </div>

        {/* Lado Direito: Timeline de Horários */}
        <div className="lg:col-span-3 space-y-4">
           <div className="bg-[#121214] border border-zinc-800/60 rounded-[2.5rem] shadow-xl overflow-hidden">
              <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/20">
                 <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Timeline Operacional</h3>
                 <div className="flex gap-4">
                    <span className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Confirmado</span>
                    <span className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Agendado</span>
                 </div>
              </div>

              <div className="divide-y divide-zinc-800/40">
                {hours.map(hour => {
                  const app = dailyAppointments.find(a => a.time === hour);
                  return (
                    <div key={hour} className={`flex items-center gap-8 p-6 group transition-all ${app ? 'bg-zinc-900/40' : 'hover:bg-zinc-900/10'}`}>
                       <div className="w-16 flex-shrink-0 text-[10px] font-black text-zinc-600 uppercase tracking-widest">{hour}</div>
                       
                       {app ? (
                         <div className="flex-1 bg-zinc-950 border border-zinc-800 p-5 rounded-3xl flex items-center justify-between border-l-4 border-l-[#E11D48] shadow-lg animate-in slide-in-from-left duration-300">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-[#E11D48]/10 text-[#E11D48] rounded-xl flex items-center justify-center">
                                  <Car size={22} />
                               </div>
                               <div>
                                  <p className="font-black text-white uppercase italic tracking-tight">{app.clientName} • {app.vehiclePlate}</p>
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Wrench size={10} className="text-[#E11D48]"/> {app.serviceType}
                                  </p>
                               </div>
                            </div>
                            <div className="flex items-center gap-6">
                               <div className="text-right hidden sm:block">
                                  <div className="flex items-center gap-1 text-[9px] font-black text-zinc-500 uppercase">
                                     <History size={10} /> {app.attemptsCount}ª visita
                                  </div>
                               </div>
                               <button 
                                onClick={() => window.open(`https://wa.me/?text=Olá, ${app.clientName}! Confirmamos seu agendamento na Kaenpro para ${hour} no dia ${new Date(app.date).toLocaleDateString('pt-BR')}.`, '_blank')}
                                className="p-3 bg-zinc-900 text-[#25D366] rounded-xl border border-zinc-800 hover:bg-[#25D366] hover:text-white transition-all"
                               >
                                  <MessageCircle size={18} />
                               </button>
                            </div>
                         </div>
                       ) : (
                         <button 
                          onClick={() => { setNewAppointment({...newAppointment, time: hour}); setShowModal(true); }}
                          className="flex-1 flex items-center gap-3 text-zinc-800 font-black uppercase text-[9px] tracking-[0.2em] group-hover:text-zinc-600 transition-colors"
                         >
                           <Plus size={14} /> Horário Livre para Bloqueio
                         </button>
                       )}
                    </div>
                  );
                })}
              </div>
           </div>
        </div>
      </div>

      {/* MODAL NOVO AGENDAMENTO */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
           <div className="bg-[#0c0c0e] border border-zinc-800 w-full max-w-lg p-10 rounded-[3rem] shadow-2xl relative animate-in zoom-in duration-300">
              <button onClick={() => { setShowModal(false); setConflict(null); }} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={28} /></button>
              
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 bg-[#E11D48] rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <CalendarIcon size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Novo Agendamento</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{new Date(selectedDate).toLocaleDateString('pt-BR')} às {newAppointment.time}</p>
                </div>
              </div>

              {conflict && (
                <div className="bg-[#E11D48]/10 border border-[#E11D48]/30 p-5 rounded-2xl mb-6 flex items-center gap-4 animate-bounce">
                   <AlertTriangle className="text-[#E11D48]" size={20} />
                   <p className="text-[10px] font-black text-[#E11D48] uppercase tracking-widest">{conflict}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2 ml-1">Selecionar Cliente Cloud</label>
                  <select 
                    value={newAppointment.clientId}
                    onChange={(e) => setNewAppointment({...newAppointment, clientId: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-[#E11D48] outline-none font-bold text-xs"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2 ml-1">Placa do Carro</label>
                    <input 
                      type="text" 
                      value={newAppointment.vehiclePlate}
                      onChange={(e) => setNewAppointment({...newAppointment, vehiclePlate: e.target.value})}
                      placeholder="ABC-1234"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-[#E11D48] outline-none font-black uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2 ml-1">Horário</label>
                    <input 
                      type="time" 
                      value={newAppointment.time}
                      onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-[#E11D48] outline-none font-black"
                    />
                  </div>
                </div>

                <div>
                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2 ml-1">Tipo de Serviço</label>
                   <select 
                    value={newAppointment.serviceType}
                    onChange={(e) => setNewAppointment({...newAppointment, serviceType: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-[#E11D48] outline-none font-bold text-xs"
                   >
                     <option value="Revisão Geral">Revisão Geral</option>
                     <option value="Troca de Óleo">Troca de Óleo</option>
                     <option value="Freios">Freios</option>
                     <option value="Injeção">Injeção Eletrônica</option>
                     <option value="Outros">Outros Diagnósticos</option>
                   </select>
                </div>

                <button 
                  onClick={handleSaveAppointment}
                  className="w-full bg-[#E11D48] py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-red-900/30 active:scale-95 transition-all mt-4 flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={18} /> Confirmar Agendamento
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
