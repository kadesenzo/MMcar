import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Menu, RefreshCw, LayoutDashboard, Wrench, Users, Shield,
  Lock, ShieldAlert, X, Cloud, Bell, Package, AlertTriangle, CheckCheck
} from 'lucide-react';
import { SyncStatus, SystemNotification, PartRequest, ServiceOrder } from '../types';
import {
  isAdminRole, isMechanicRole, isReceptionRole, isStockRole,
  readWorkshopData, writeWorkshopData, isOrderStalled, getVehicleStalledHours
} from '../src/utils/workshopHelpers';

export type WorkspaceMode = 'PRINCIPAL' | 'MECANICO' | 'RECEPCAO' | 'ESTOQUE' | 'ADMIN';

interface HeaderProps {
  onLogout: (forgetDevice?: boolean) => void;
  onToggleSidebar: () => void;
  role: string;
  username: string;
  syncStatus: SyncStatus;
  workspaceMode: WorkspaceMode;
  onWorkspaceModeChange: (mode: WorkspaceMode) => void;
  tenant?: string;
}

const Header: React.FC<HeaderProps> = ({
  onLogout, onToggleSidebar, role, username, syncStatus,
  workspaceMode, onWorkspaceModeChange, tenant = 'rafael'
}) => {
  const navigate = useNavigate();
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [pendingParts, setPendingParts] = useState<PartRequest[]>([]);
  const [stalledOrders, setStalledOrders] = useState<ServiceOrder[]>([]);

  const loadAlerts = () => {
    const notifs = readWorkshopData<SystemNotification[]>(tenant, 'notifications', []);
    const partReqs = readWorkshopData<PartRequest[]>(tenant, 'part_requests', []);
    const orders = readWorkshopData<ServiceOrder[]>(tenant, 'orders', []);
    setNotifications(notifs);
    setPendingParts(partReqs.filter((p) => p.status === 'PENDENTE'));
    setStalledOrders(orders.filter((o) => isOrderStalled(o, 48)));
  };

  // Listen to live presence updates and storage changes
  useEffect(() => {
    loadAlerts();

    const fetchPresence = async () => {
      try {
        const res = await fetch(`/api/presence/${tenant || 'rafael'}`);
        if (res.ok) {
          const list = await res.json();
          setOnlineUsers(list);
        }
      } catch {
        // quiet fail
      }
    };
    fetchPresence();

    const handlePresenceUpdate = (e: Event) => {
      const sessions = (e as CustomEvent).detail;
      if (Array.isArray(sessions)) {
        setOnlineUsers(sessions);
      }
    };

    window.addEventListener('kaen_presence_updated', handlePresenceUpdate);
    window.addEventListener('kaen_storage_updated', loadAlerts);
    return () => {
      window.removeEventListener('kaen_presence_updated', handlePresenceUpdate);
      window.removeEventListener('kaen_storage_updated', loadAlerts);
    };
  }, [tenant]);

  const unreadNotifs = useMemo(
    () => notifications.filter((n) => !n.readBy?.includes(username)),
    [notifications, username]
  );

  const totalBadgeCount = unreadNotifs.length + pendingParts.length + stalledOrders.length;

  const markAllRead = () => {
    const updated = notifications.map((n) => ({
      ...n,
      readBy: Array.from(new Set([...(n.readBy || []), username]))
    }));
    writeWorkshopData(tenant, 'notifications', updated);
    setNotifications(updated);
  };

  // Filter available workspaces dynamically based on the user's role
  const allWorkspaces: {
    mode: WorkspaceMode;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    allowed: boolean;
  }[] = [
    { mode: 'PRINCIPAL', label: 'Painel Geral', icon: LayoutDashboard, color: 'hover:text-[#FF2D55]', allowed: true },
    { mode: 'RECEPCAO', label: 'Recepção & Pátio', icon: Users, color: 'hover:text-emerald-400', allowed: isAdminRole(role) || isReceptionRole(role) },
    { mode: 'MECANICO', label: 'Oficina / Pista', icon: Wrench, color: 'hover:text-amber-400', allowed: isAdminRole(role) || isMechanicRole(role) },
    { mode: 'ESTOQUE', label: 'Estoque', icon: Package, color: 'hover:text-sky-400', allowed: isAdminRole(role) || isStockRole(role) },
    { mode: 'ADMIN', label: 'Admin', icon: Shield, color: 'hover:text-red-400', allowed: isAdminRole(role) }
  ];

  const allowedWorkspaces = allWorkspaces.filter((ws) => ws.allowed);

  return (
    <header className="h-auto min-h-20 md:min-h-22 flex flex-col lg:flex-row items-center justify-between px-3 sm:px-6 xl:px-8 z-40 bg-black/50 backdrop-blur-md border-b border-white/5 sticky top-0 gap-2.5 sm:gap-3 py-3 lg:py-4 mb-4 w-full max-w-full">
      <div className="flex flex-row items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between lg:justify-start min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2.5 sm:p-3 bg-zinc-900/70 hover:bg-zinc-900 border border-white/5 rounded-2xl text-zinc-300 hover:text-white hover:border-[#FF2D55] transition-all active:scale-95 flex items-center gap-2 group shrink-0 cursor-pointer"
        >
          <Menu size={16} />
          <span className="hidden sm:block text-[9px] font-black uppercase tracking-[0.2em] group-hover:text-[#FF2D55] whitespace-nowrap">
            Menu
          </span>
        </button>

        {/* WORKSPACE MODE SEGMENTED BAR */}
        <div className="bg-zinc-950/90 border border-white/5 p-1 rounded-2xl flex items-center gap-1 shadow-inner overflow-x-auto no-scrollbar max-w-full min-w-0">
          {allowedWorkspaces.map((it) => {
            const ActiveIcon = it.icon;
            const isSelected = workspaceMode === it.mode;
            return (
              <button
                key={it.mode}
                onClick={() => onWorkspaceModeChange(it.mode)}
                className={`px-2.5 py-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 group/btn shrink-0 cursor-pointer
                ${isSelected
                  ? 'bg-white text-black font-black shadow-md'
                  : `text-zinc-500 hover:bg-white/5 ${it.color}`}`}
                title={it.label}
              >
                <ActiveIcon size={13} className={isSelected ? 'text-black' : 'text-zinc-500'} />
                <span className="hidden xl:block text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
                  {it.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between sm:justify-end min-w-0 relative">
        {/* Online users badge */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-950/70 border border-white/5 rounded-full text-zinc-400 max-w-[140px] sm:max-w-[175px] min-w-0 shrink">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
            <span
              className="text-[8px] font-black uppercase tracking-wider leading-none truncate font-mono tabular-nums"
              title={onlineUsers.map((s) => s.realUsername).join(', ')}
            >
              {onlineUsers.length} ON: {onlineUsers.map((s) => String(s.realUsername || '').split(' ')[0]).slice(0, 2).join(', ')}
              {onlineUsers.length > 2 ? '...' : ''}
            </span>
          </div>
        )}

        {/* Notification Center Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifPanel((prev) => !prev)}
            className="relative p-2.5 bg-zinc-900/70 hover:bg-zinc-800 border border-white/5 hover:border-[#FF2D55]/50 rounded-full text-zinc-300 hover:text-white transition-all cursor-pointer shrink-0"
            title="Central de Notificações & Alertas"
            aria-label="Notificações"
          >
            <Bell size={15} />
            {totalBadgeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#FF2D55] text-white text-[9px] font-black rounded-full flex items-center justify-center tabular-nums shadow-lg">
                {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
              </span>
            )}
          </button>

          {showNotifPanel && (
            <div className="absolute right-0 mt-3 w-[88vw] sm:w-96 bg-[#0D0D10] border border-white/10 rounded-3xl shadow-2xl p-4 z-[220] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#FF2D55]">Central de Notificações</p>
                  <p className="text-[9px] text-zinc-500">Alertas operacionais em tempo real</p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[9px] font-black uppercase text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck size={12} /> Lidas
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifPanel(false)}
                    className="text-zinc-500 hover:text-white p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {pendingParts.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => {
                      setShowNotifPanel(false);
                      onWorkspaceModeChange('PRINCIPAL');
                      navigate('/inventory');
                    }}
                    className="w-full text-left p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 hover:border-sky-400/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-sky-400 flex items-center gap-1">
                        <Package size={11} /> Solicitação de Peça
                      </span>
                      <span className="text-[9px] font-mono text-zinc-400">OS #{req.osNumber}</span>
                    </div>
                    <p className="text-xs font-bold text-white mt-1">
                      {req.quantity}x {req.partName}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Mecânico: {req.mechanicName} • Placa {req.vehiclePlate}
                    </p>
                  </button>
                ))}

                {stalledOrders.map((ord) => (
                  <button
                    key={ord.id}
                    onClick={() => {
                      setShowNotifPanel(false);
                      onWorkspaceModeChange('PRINCIPAL');
                      navigate('/patio');
                    }}
                    className="w-full text-left p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-400/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-amber-400 flex items-center gap-1">
                        <AlertTriangle size={11} /> Veículo Parado
                      </span>
                      <span className="text-[9px] font-mono text-amber-300 tabular-nums">
                        +{getVehicleStalledHours(ord)}h
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white mt-1">
                      {ord.vehicleModel} ({ord.vehiclePlate})
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Status: {ord.status} • Box {ord.boxNumber || 'S/ Box'}
                    </p>
                  </button>
                ))}

                {notifications.slice(0, 12).map((n) => {
                  const isUnread = !n.readBy?.includes(username);
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (n.relatedPath) {
                          onWorkspaceModeChange('PRINCIPAL');
                          navigate(n.relatedPath);
                        }
                        setShowNotifPanel(false);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                        isUnread
                          ? 'bg-[#FF2D55]/10 border-[#FF2D55]/25'
                          : 'bg-zinc-950 border-white/5 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-[#FF2D55]">{n.category}</span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mt-0.5">{n.title}</p>
                      <p className="text-[10px] text-zinc-400 leading-snug mt-0.5">{n.message}</p>
                    </button>
                  );
                })}

                {totalBadgeCount === 0 && notifications.length === 0 && (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    Nenhum alerta operacional pendente no pátio.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cloud Sync Button */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('kaen_force_cloud_backup'))}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/60 hover:bg-zinc-800 rounded-full border border-white/5 hover:border-emerald-500/40 transition-all cursor-pointer group active:scale-95 shrink-0"
          title="Sincronização em Nuvem MM Car ativa. Clique para backup instantâneo."
        >
          {syncStatus === SyncStatus.SYNCING ? (
            <RefreshCw size={11} className="text-[#FF2D55] animate-spin" />
          ) : (
            <Cloud size={12} className="text-emerald-400" />
          )}
          <span className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-300 flex items-center gap-1.5 whitespace-nowrap">
            <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === SyncStatus.SYNCING ? 'bg-amber-400' : 'bg-emerald-500'}`} />
            <span className="hidden sm:inline">{syncStatus === SyncStatus.SYNCING ? 'Sincronizando...' : 'Nuvem Ativa'}</span>
            <span className="sm:hidden">{syncStatus === SyncStatus.SYNCING ? '...' : 'Nuvem'}</span>
          </span>
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 bg-zinc-900/50 px-2.5 py-1 rounded-full border border-white/5 ml-auto sm:ml-0 shrink-0 max-w-full">
          <div className="text-right pl-1.5 hidden sm:block max-w-[150px] min-w-0">
            <p className="text-[10px] font-black text-white uppercase italic leading-none truncate">{username}</p>
            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-1 truncate">{role}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 font-black text-[10px] uppercase italic shrink-0">
            {username.slice(0, 2)}
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-2 text-zinc-500 hover:text-[#FF2D55] transition-all shrink-0 cursor-pointer"
            title="Encerrar Sessão / Segurança"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Logout Security Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0D0D0E] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl space-y-6 relative text-left">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-[#FF2D55] rounded-2xl flex items-center justify-center shrink-0">
                <Shield size={22} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase italic tracking-wider text-white">ENCERRAR SESSÃO</h3>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">MM Car Auto Center • Segurança</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
              Como deseja sair deste terminal da MM Car Auto Center?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout(false);
                }}
                className="w-full p-4 bg-zinc-900/80 hover:bg-zinc-800/90 border border-white/5 hover:border-white/20 rounded-2xl transition-all text-left flex items-center gap-4 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-300 group-hover:text-white shrink-0">
                  <Lock size={18} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-white tracking-wide">Bloquear Sessão</p>
                  <p className="text-[9px] text-zinc-400 mt-0.5">Mantém este aparelho salvo como confiável para reabertura rápida.</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout(true);
                }}
                className="w-full p-4 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 rounded-2xl transition-all text-left flex items-center gap-4 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-[#FF2D55] shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-red-400 tracking-wide">Desconectar e Esquecer Aparelho</p>
                  <p className="text-[9px] text-zinc-400 mt-0.5">Próximo acesso exigirá a senha do operador.</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowLogoutModal(false)}
              className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5 cursor-pointer"
            >
              Continuar Trabalhando
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
