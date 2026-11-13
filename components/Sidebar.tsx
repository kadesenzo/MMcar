import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Car, PlusSquare, Package, UserCheck,
  Settings, Wrench, DollarSign, Smartphone, X, PieChart, CalendarDays, Sparkles,
  BookOpen, ClipboardCheck, Truck, BarChart3, Megaphone, Star, Repeat, MessageCircle,
  Camera, Lock, Kanban, ShieldCheck, Receipt
} from 'lucide-react';
import MMCarLogo from './MMCarLogo';
import { UserRole } from '../types';
import { isAdminRole, isMechanicRole, isReceptionRole, isStockRole } from '../src/utils/workshopHelpers';

interface SidebarProps {
  role: UserRole | string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: () => void;
}

type SectorFilter = 'ALL' | 'ADMIN' | 'RECEPTION' | 'MECHANIC' | 'STOCK';

interface MenuItemDef {
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
  sectors: SectorFilter[];
}

const Sidebar: React.FC<SidebarProps> = ({ role, isOpen, onClose, onNavigate }) => {
  const canAccess = (sectors: SectorFilter[]) => {
    if (sectors.includes('ALL')) return true;
    if (isAdminRole(role)) return true;
    if (isReceptionRole(role) && sectors.includes('RECEPTION')) return true;
    if (isMechanicRole(role) && sectors.includes('MECHANIC')) return true;
    if (isStockRole(role) && sectors.includes('STOCK')) return true;
    return false;
  };

  const menuItems: { category: string; items: MenuItemDef[] }[] = [
    {
      category: 'OPERAÇÃO & PÁTIO',
      items: [
        { name: 'Painel Diretoria', icon: LayoutDashboard, path: '/dashboard', sectors: ['ADMIN', 'RECEPTION', 'STOCK'] },
        { name: 'Pátio & Boxes', icon: Kanban, path: '/patio', sectors: ['ADMIN', 'RECEPTION', 'MECHANIC', 'STOCK'] },
        { name: 'Ordens de Serviço', icon: Wrench, path: '/orders', sectors: ['ADMIN', 'RECEPTION', 'MECHANIC', 'STOCK'] },
        { name: 'Nova OS / Entrada', icon: PlusSquare, path: '/orders/new', sectors: ['ADMIN', 'RECEPTION'] },
        { name: 'Checklists de Pátio', icon: ClipboardCheck, path: '/checklists', sectors: ['ADMIN', 'RECEPTION', 'MECHANIC'] },
        { name: 'Terminal Mecânico', icon: Smartphone, path: '/terminal', sectors: ['ADMIN', 'MECHANIC'] },
        { name: 'Qualidade & Garantias', icon: ShieldCheck, path: '/quality', sectors: ['ADMIN', 'RECEPTION', 'MECHANIC'] },
        { name: 'Agenda de Pátio', icon: CalendarDays, path: '/calendar', sectors: ['ADMIN', 'RECEPTION', 'MECHANIC'] },
      ]
    },
    {
      category: 'COMERCIAL & CLIENTES',
      items: [
        { name: 'Orçamentos & Aprovação', icon: DollarSign, path: '/budgets', sectors: ['ADMIN', 'RECEPTION', 'MECHANIC'] },
        { name: 'Clientes', icon: Users, path: '/clients', sectors: ['ADMIN', 'RECEPTION'] },
        { name: 'Veículos & Histórico', icon: Car, path: '/vehicles', sectors: ['ADMIN', 'RECEPTION', 'MECHANIC'] },
        { name: 'WhatsApp Hub', icon: MessageCircle, path: '/whatsapp', sectors: ['ADMIN', 'RECEPTION'] },
        { name: 'Pós-Venda & Revisões', icon: Repeat, path: '/after-sales', sectors: ['ADMIN', 'RECEPTION'] },
        { name: 'Avaliações & Qualidade', icon: Star, path: '/reviews', sectors: ['ADMIN', 'RECEPTION'] },
        { name: 'Marketing & Funil', icon: Megaphone, path: '/marketing', sectors: ['ADMIN', 'RECEPTION'] },
      ]
    },
    {
      category: 'ESTOQUE & SUPRIMENTOS',
      items: [
        { name: 'Estoque & Solicitações', icon: Package, path: '/inventory', sectors: ['ADMIN', 'STOCK', 'RECEPTION'] },
        { name: 'Fornecedores', icon: Truck, path: '/suppliers', sectors: ['ADMIN', 'STOCK', 'RECEPTION'] },
      ]
    },
    {
      category: 'FINANCEIRO & FISCAL',
      items: [
        { name: 'Financeiro & DRE', icon: PieChart, path: '/financial', sectors: ['ADMIN'] },
        { name: 'Fiscal (NF-e / NFS-e)', icon: Receipt, path: '/fiscal', sectors: ['ADMIN', 'RECEPTION'] },
        { name: 'Cobranças & Caixa', icon: DollarSign, path: '/billing', sectors: ['ADMIN', 'RECEPTION'] },
        { name: 'Relatórios & Comissões', icon: BarChart3, path: '/reports', sectors: ['ADMIN'] },
      ]
    },
    {
      category: 'GOVERNANÇA & EQUIPE',
      items: [
        { name: 'Equipe MM Car', icon: UserCheck, path: '/employees', sectors: ['ADMIN'] },
        { name: 'Usuários & Auditoria', icon: Lock, path: '/users', sectors: ['ADMIN'] },
        { name: 'Central de Fotos', icon: Camera, path: '/gallery', sectors: ['ADMIN', 'RECEPTION', 'MECHANIC'] },
        { name: 'Assistente Técnico IA', icon: Sparkles, path: '/ai-marketing', sectors: ['ADMIN', 'RECEPTION', 'MECHANIC'] },
        { name: 'Manual & Processos', icon: BookOpen, path: '/project-dossier', sectors: ['ADMIN', 'RECEPTION', 'MECHANIC', 'STOCK'] },
      ]
    }
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[140] animate-in fade-in duration-300 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 sm:inset-y-4 sm:left-4 z-[150] w-[85vw] sm:w-[20.5rem] glass-card rounded-r-[2.5rem] sm:rounded-[3rem] lg:rounded-[3.5rem] transition-all duration-500 transform ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col overflow-hidden shadow-[0_50px_120px_rgba(0,0,0,0.9)] border-white/10
        ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-[125%] opacity-0 pointer-events-none lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto'}
        lg:relative lg:inset-y-0 lg:left-0 lg:m-6 lg:mr-0
      `}>
        <div className="p-6 sm:p-8 flex items-center justify-between flex-shrink-0 border-b border-white/5">
          <div className="flex items-center">
            <MMCarLogo variant="horizontal" className="h-9 sm:h-10 w-auto" />
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/5 hover:bg-[#FF2D55] rounded-xl text-zinc-400 hover:text-white transition-all active:scale-90 lg:hidden cursor-pointer shrink-0"
            aria-label="Fechar Menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-6 no-scrollbar pb-14">
          {menuItems.map((cat) => {
            const filteredItems = cat.items.filter((item) => canAccess(item.sectors));
            if (filteredItems.length === 0) return null;

            return (
              <div key={cat.category} className="space-y-2">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.35em] ml-5 italic">
                  {cat.category}
                </p>
                <div className="space-y-1.5">
                  {filteredItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        onNavigate?.();
                        onClose();
                      }}
                      className={({ isActive }) => `
                        flex items-center justify-between px-5 py-3.5 rounded-[1.75rem] transition-all duration-300 group relative
                        ${isActive
                          ? 'bg-[#FF2D55] text-white shadow-[0_14px_34px_rgba(255,45,85,0.32)]'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-white'}
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center space-x-3.5 min-w-0">
                            <item.icon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-[#FF2D55]'}`} />
                            <span className="font-black text-[10px] uppercase tracking-[0.16em] italic whitespace-nowrap truncate">
                              {item.name}
                            </span>
                          </div>
                          {isActive && (
                            <span className="w-1.5 h-1.5 bg-white rounded-full shrink-0" />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {isAdminRole(role) && (
          <div className="p-6 border-t border-white/5 bg-zinc-950/30">
            <NavLink
              to="/settings"
              onClick={() => {
                onNavigate?.();
                onClose();
              }}
              className={({ isActive }) => `
                flex items-center gap-3.5 cursor-pointer transition-colors group
                ${isActive ? 'text-[#FF2D55]' : 'text-zinc-500 hover:text-white'}
              `}
            >
              <Settings size={18} className="group-hover:rotate-45 transition-transform shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest italic whitespace-nowrap">
                Governança & Ajustes
              </span>
            </NavLink>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
