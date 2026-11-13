import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, Wrench, ShieldCheck, Clock,
  Calendar, MapPin, ArrowRight, Smartphone,
  UserCheck, Activity, Zap, Package, PieChart, Layers
} from 'lucide-react';
import MMCarLogo from '../components/MMCarLogo';
import { saveWorkshopFieldToCloud } from '../src/lib/firebase';
import heroWorkshopImg from '../src/assets/images/mmcar_workshop_hero_1794597820110.jpg';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showBooking, setShowBooking] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    vehicle: '',
    date: '',
    time: '',
    service: 'Revisão Preventiva Completa'
  });

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Olá! Sou ${bookingForm.name}. Gostaria de agendar um(a) ${bookingForm.service} na MM Car Auto Center para o dia ${bookingForm.date} às ${bookingForm.time} no veículo ${bookingForm.vehicle}.`;
    const phone = '5513996892958';

    const savedApps = JSON.parse(localStorage.getItem('kaen_appointments') || '[]');
    const newApp = {
      id: Math.random().toString(36).substr(2, 9),
      ...bookingForm,
      clientName: bookingForm.name,
      vehiclePlate: 'SITE-SOLICITADO',
      status: 'Pendente',
      attemptsCount: 1,
      createdAt: new Date().toISOString()
    };
    const updatedApps = [...savedApps, newApp];
    localStorage.setItem('kaen_appointments', JSON.stringify(updatedApps));

    try {
      await fetch('/api/public/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApp)
      });
    } catch {
      // offline fallback
    }
    try {
      await saveWorkshopFieldToCloud('kaenpro_rafael_appointments', updatedApps);
      await saveWorkshopFieldToCloud('kaen_appointments', updatedApps);
    } catch {
      // offline fallback
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    setShowBooking(false);
  };

  return (
    <div className="bg-black text-white min-h-screen selection:bg-[#FF2D55] selection:text-white font-['Inter'] overflow-x-hidden">
      {/* BACKDROP DO MENU MOBILE */}
      {isMenuOpen && (
        <div
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[190]"
          aria-hidden="true"
        />
      )}

      {/* DRAWER LATERAL */}
      <div
        className={`fixed inset-y-0 right-0 z-[200] w-[85vw] max-w-[340px] glass-card border-l border-white/10 transition-all duration-500 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto ${
          isMenuOpen ? 'translate-x-0 shadow-[-50px_0_100px_rgba(0,0,0,0.9)]' : 'translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
            <MMCarLogo variant="horizontal" className="h-8 w-auto" />
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 hover:text-[#FF2D55] transition-colors rounded-xl bg-white/5 cursor-pointer"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-3">NAVEGAÇÃO</p>
              <nav className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-left text-sm font-bold text-white transition-all cursor-pointer"
                >
                  <span>Início</span>
                  <ArrowRight size={14} className="text-zinc-500" />
                </button>
                <a
                  href="#setores"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-left text-sm font-bold text-zinc-300 hover:text-white transition-all"
                >
                  <span>Operação Multi-Setor</span>
                  <ArrowRight size={14} className="text-zinc-500" />
                </a>
                <a
                  href="#servicos"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-left text-sm font-bold text-zinc-300 hover:text-white transition-all"
                >
                  <span>Serviços & Engenharia</span>
                  <ArrowRight size={14} className="text-zinc-500" />
                </a>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowBooking(true);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#FF2D55]/15 border border-[#FF2D55]/30 text-left text-sm font-black text-[#FF2D55] hover:bg-[#FF2D55] hover:text-white transition-all mt-1 cursor-pointer"
                >
                  <span>Agendar Revisão</span>
                  <Calendar size={15} />
                </button>
              </nav>
            </div>

            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-3">SISTEMA EMPRESARIAL</p>
              <nav className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/login');
                  }}
                  className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 text-left group transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-[#FF2D55] text-white transition-all shrink-0">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white leading-tight">Acessar Sistema MM Car</p>
                    <p className="text-[9px] text-zinc-500 font-semibold">Diretoria, Recepção, Estoque & Financeiro</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/login');
                  }}
                  className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 text-left group transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-amber-500 text-white transition-all shrink-0">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white leading-tight">Terminal do Mecânico</p>
                    <p className="text-[9px] text-zinc-500 font-semibold">Controle de OS e Boxes</p>
                  </div>
                </button>
              </nav>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-relaxed">
            MM CAR AUTO CENTER<br />SISTEMA DE GESTÃO EMPRESARIAL
          </p>
        </div>
      </div>

      {/* NAVBAR FLUTUANTE */}
      <div className="fixed top-3 sm:top-4 left-0 w-full z-[100] px-3 sm:px-8 flex justify-center">
        <nav className="w-full max-w-7xl glass-nav rounded-full px-4 sm:px-8 py-2.5 sm:py-3.5 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <MMCarLogo variant="horizontal" className="h-8 sm:h-10 w-auto" />
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-xs font-bold text-white hover:text-[#FF2D55] transition-colors relative py-1 cursor-pointer whitespace-nowrap">
              Início
            </button>
            <a href="#setores" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors whitespace-nowrap">
              5 Setores
            </a>
            <a href="#servicos" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors whitespace-nowrap">
              Serviços
            </a>
            <button
              onClick={() => setShowModulesModal(true)}
              className="text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-3 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Layers size={12} />
              <span>10 Módulos • 50 Funções</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Entrar no Sistema</span>
            </button>
            <button
              onClick={() => setShowBooking(true)}
              className="bg-gradient-to-r from-[#FF5E36] to-[#FF2D55] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-[0_10px_25px_rgba(255,45,85,0.4)] active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
            >
              <span>Agendar Visita</span>
              <ArrowRight size={13} />
            </button>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 glass-card rounded-full flex items-center justify-center text-white hover:border-[#FF2D55] transition-all shrink-0 cursor-pointer"
              aria-label="Abrir Menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </nav>
      </div>

      {/* HERO SECTION */}
      <section className="relative min-h-[92vh] sm:min-h-screen flex flex-col justify-between pt-28 sm:pt-36 pb-12 sm:pb-16 px-4 sm:px-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroWorkshopImg}
            alt="MM Car Auto Center — Estrutura de Engenharia Automotiva"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/75" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-black/70" />
        </div>

        <div className="relative z-10 w-full text-center mt-4 sm:mt-8 flex flex-col items-center">
          <MMCarLogo variant="horizontal" className="h-16 sm:h-24 md:h-28 w-auto drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)]" />
          <p className="text-[10px] sm:text-xs font-black text-zinc-200 uppercase tracking-[0.35em] mt-4">
            AUTO CENTER · GESTÃO AUTOMOTIVA INTEGRADA
          </p>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mt-10 pt-8">
          <div className="lg:col-span-7 space-y-5 text-left">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Gestão automotiva completa, do pátio ao DRE e notas fiscais.
            </h1>
            <p className="text-sm sm:text-base text-zinc-200 font-medium leading-relaxed max-w-xl">
              Na <strong className="text-[#FF2D55] font-bold">MM Car Auto Center</strong>, cada setor opera com precisão: recepção com checklist fotográfico de entrada, mecânicos no box, controle de peças no estoque, inspeção de qualidade e financeiro integrado.
            </p>

            {/* Clean Monogram Social Proof (no external stock avatars) */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex -space-x-2.5 items-center">
                {['MC', 'AR', 'JP', 'LF'].map((initials, idx) => (
                  <div
                    key={initials}
                    className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center text-xs font-black text-white shadow-lg ${
                      idx === 0 ? 'bg-[#FF2D55]' : idx === 1 ? 'bg-zinc-800' : idx === 2 ? 'bg-zinc-700' : 'bg-zinc-900'
                    }`}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-extrabold text-white leading-tight flex items-center gap-2">
                  <span className="tabular-nums">+2.500 Veículos Atendidos</span>
                  <span className="text-amber-400">★★★★★</span>
                </p>
                <p className="text-[11px] text-zinc-300 font-medium">
                  Transparência técnica • Garantia de 90 dias em serviços e peças
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 w-full sm:max-w-md lg:ml-auto">
            <div className="bg-white text-zinc-900 p-6 rounded-3xl shadow-2xl space-y-4 text-left">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-extrabold text-xl text-black tracking-tight">MM Car Auto Center</h3>
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    Operação Digital
                  </span>
                </div>
                <p className="text-xs text-zinc-600 font-semibold">8 Boxes Ativos • Atendimento Multiusuário</p>
                <p className="text-[11px] text-zinc-500 font-medium">Segunda a Sexta • 08h00 às 18h00</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => navigate('/login')}
                  className="bg-zinc-950 hover:bg-zinc-800 text-white py-3 px-4 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all text-center cursor-pointer"
                >
                  Acesso Equipe
                </button>
                <button
                  onClick={() => setShowBooking(true)}
                  className="bg-gradient-to-r from-[#FF5E36] to-[#FF2D55] text-white py-3 px-4 rounded-xl font-black uppercase text-[10px] tracking-wider shadow-md hover:opacity-95 transition-all text-center cursor-pointer"
                >
                  Agendar Revisão
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 5 SETORES */}
      <section id="setores" className="py-20 px-4 sm:px-8 bg-zinc-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 text-left">
            <div className="space-y-3 max-w-2xl">
              <span className="text-[#FF2D55] font-black uppercase tracking-[0.3em] text-xs">ARQUITETURA EMPRESARIAL</span>
              <h2 className="font-display text-3xl sm:text-5xl font-black text-white tracking-tight">
                Cada setor com seu próprio painel e permissão.
              </h2>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3.5 rounded-2xl bg-[#FF2D55] hover:bg-[#ff1744] text-white font-black uppercase text-xs tracking-wider flex items-center gap-2 self-start md:self-auto cursor-pointer whitespace-nowrap"
            >
              <span>Entrar no Sistema</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
            {[
              {
                sector: '01 · Diretoria',
                title: 'Administração & KPIs',
                desc: 'Faturamento dia/semana/mês, lucratividade real, produtividade, veículos parados e auditoria.',
                icon: PieChart
              },
              {
                sector: '02 · Recepção',
                title: 'Pátio & Atendimento',
                desc: 'Check-in com 10 categorias e fotos, confirmação do cliente, quadro de boxes, OS e entrega.',
                icon: UserCheck
              },
              {
                sector: '03 · Oficina',
                title: 'Terminal do Mecânico',
                desc: 'Mobile-first no elevador: play/pause com motivo, atividades, pedido de peças e ajuda técnica.',
                icon: Wrench
              },
              {
                sector: '04 · Almoxarifado',
                title: 'Estoque & Compras',
                desc: 'Peças com custo/venda, alertas mínimos, fornecedores e fila de solicitações das OS.',
                icon: Package
              },
              {
                sector: '05 · Fiscal & Caixa',
                title: 'Financeiro & NF-e',
                desc: 'Contas a pagar/receber, fechamento de caixa diário, DRE gerencial e NF-e / NFS-e / NFC-e.',
                icon: ShieldCheck
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.sector} className="bg-black/70 border border-white/10 hover:border-[#FF2D55]/40 p-6 rounded-3xl space-y-4 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF2D55]">{item.sector}</span>
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white">
                      <Icon size={18} />
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold text-white">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SEÇÃO SERVIÇOS */}
      <section id="servicos" className="py-20 px-4 sm:px-8 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[#FF2D55] font-extrabold uppercase tracking-[0.3em] text-xs">PORTFÓLIO DE ESPECIALIDADES</span>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-white tracking-tight">Engenharia & Manutenção</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {[
              {
                title: 'Diagnóstico Eletrônico',
                desc: 'Varredura por scanner avançado, telemetria de injeção, ABS, câmbio e módulos eletrônicos.',
                icon: Zap,
                badge: 'Scanner Pro'
              },
              {
                title: 'Revisão Preventiva 100%',
                desc: 'Checklist completo com registro fotográfico e aprovação transparente antes da execução.',
                icon: ShieldCheck,
                badge: 'Garantia 90d'
              },
              {
                title: 'Freios, Suspensão & 3D',
                desc: 'Substituição de pastilhas, discos, amortecedores, buchas e alinhamento computadorizado.',
                icon: Wrench,
                badge: 'Box Dedicado'
              },
              {
                title: 'Câmbio Automático',
                desc: 'Troca completa de fluido por diálise e manutenção preventiva de transmissão automática.',
                icon: Activity,
                badge: 'Alta Precisão'
              }
            ].map((srv) => {
              const IconComp = srv.icon;
              return (
                <div key={srv.title} className="bg-zinc-950 border border-white/10 hover:border-[#FF2D55]/40 p-6 rounded-3xl flex flex-col justify-between space-y-5 transition-all">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="w-11 h-11 bg-white/5 text-white rounded-2xl flex items-center justify-center">
                        <IconComp size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full">{srv.badge}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{srv.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{srv.desc}</p>
                  </div>
                  <button
                    onClick={() => setShowBooking(true)}
                    className="text-xs font-bold text-[#FF2D55] flex items-center gap-1.5 hover:underline cursor-pointer"
                  >
                    <span>Solicitar Atendimento</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-4 sm:px-8 border-t border-white/5 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <MMCarLogo variant="horizontal" className="h-9 w-auto" />
          <div className="flex flex-wrap justify-center gap-6 text-xs text-zinc-400 font-medium">
            <a href="#setores" className="hover:text-white transition-colors">Setores</a>
            <a href="#servicos" className="hover:text-white transition-colors">Serviços</a>
            <button onClick={() => setShowBooking(true)} className="hover:text-white transition-colors cursor-pointer">Agendar</button>
            <button onClick={() => navigate('/login')} className="hover:text-[#FF2D55] transition-colors font-bold text-white cursor-pointer">
              Acessar Sistema
            </button>
          </div>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            © {new Date().getFullYear()} MM CAR AUTO CENTER · SISTEMA DE GESTÃO EMPRESARIAL
          </p>
        </div>
      </footer>

      {/* MODAL AGENDAMENTO */}
      {showBooking && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
          <div className="w-full max-w-xl bg-zinc-950 border border-white/10 p-6 sm:p-10 rounded-[2rem] shadow-2xl relative my-auto">
            <button onClick={() => setShowBooking(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-white cursor-pointer">
              <X size={22} />
            </button>

            <div className="text-center mb-6">
              <span className="text-[#FF2D55] font-black text-[10px] uppercase tracking-[0.3em] block mb-1">
                MM CAR AUTO CENTER
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-white">Agendar Atendimento</h2>
              <p className="text-xs text-zinc-400 mt-1">Seu agendamento cai direto na agenda da recepção</p>
            </div>

            <form onSubmit={handleBooking} className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1">Nome Completo</label>
                <input
                  required
                  type="text"
                  placeholder="EX: MARCOS SILVA"
                  value={bookingForm.name}
                  onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value.toUpperCase() })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold uppercase outline-none focus:border-[#FF2D55]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1">WhatsApp</label>
                  <input
                    required
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-[#FF2D55]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1">Veículo</label>
                  <input
                    required
                    type="text"
                    placeholder="EX: JEEP COMPASS 2022"
                    value={bookingForm.vehicle}
                    onChange={(e) => setBookingForm({ ...bookingForm, vehicle: e.target.value.toUpperCase() })}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold uppercase outline-none focus:border-[#FF2D55]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1">Data</label>
                  <input
                    required
                    type="date"
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-[#FF2D55]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1">Horário</label>
                  <input
                    required
                    type="time"
                    value={bookingForm.time}
                    onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-[#FF2D55]"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#FF5E36] to-[#FF2D55] text-white py-4 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg hover:opacity-95 cursor-pointer"
              >
                Confirmar Agendamento via WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 10 MÓDULOS */}
      {showModulesModal && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="w-full max-w-2xl bg-zinc-950 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative max-h-[85vh] overflow-y-auto text-left space-y-6">
            <button onClick={() => setShowModulesModal(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-white cursor-pointer">
              <X size={22} />
            </button>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF2D55]">MM CAR AUTO CENTER</span>
              <h3 className="font-display text-2xl font-black text-white mt-1">10 Módulos Empresariais Integrados</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                '01. Painel Diretoria, Metas & Lucro',
                '02. Pátio, Boxes 01–08 & Checklist 10 Itens',
                '03. Ordens de Serviço com Timeline & Audit',
                '04. Terminal Móvel do Mecânico (Play/Pause/Peças)',
                '05. Orçamentos, Revisões & Aprovação WhatsApp',
                '06. Clientes, Frota & Lembretes Preventivos',
                '07. Estoque, Custo/Venda & Solicitações da OS',
                '08. Financeiro, Contas Pagar/Receber, Caixa & DRE',
                '09. Fiscal Estruturado (NF-e, NFC-e, NFS-e)',
                '10. Qualidade, Retrabalho, Garantias & Comissões'
              ].map((m) => (
                <div key={m} className="p-3.5 rounded-xl bg-white/5 border border-white/10 font-bold text-zinc-200">
                  {m}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowModulesModal(false);
                  navigate('/login');
                }}
                className="bg-[#FF2D55] text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Acessar Sistema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
