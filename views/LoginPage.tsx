import React, { useState, useEffect } from 'react';
import {
  Wrench, Eye, EyeOff, RefreshCw, ArrowLeft,
  Key, CheckCircle, ShieldCheck, Lock, ArrowRight, Trash2, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MMCarLogo from '../components/MMCarLogo';
import { UserRole } from '../types';

interface LoginPageProps {
  onLogin: (username: string, role: UserRole, realName: string, activeUser: string) => void;
}

interface AppUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  status: 'ATIVO' | 'BLOQUEADO';
  lastLogin: string;
  deviceRegistered: string;
  password?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

const DEFAULT_USERS: AppUser[] = [
  {
    id: 'usr-1',
    name: 'Diretoria MM Car',
    username: 'rafael',
    role: 'Dono',
    status: 'ATIVO',
    lastLogin: 'Nunca logou',
    deviceRegistered: 'Desktop Master (Diretoria)',
    password: 'enzo1234',
    securityQuestion: 'Qual o nome da oficina principal?',
    securityAnswer: 'MM CAR'
  },
  {
    id: 'usr-2',
    name: 'Eduardo Maciel',
    username: 'eduardo',
    role: 'Mecânico',
    status: 'ATIVO',
    lastLogin: 'Nunca logou',
    deviceRegistered: 'Tablet Oficina (Box 01)',
    password: 'mec1234',
    securityQuestion: 'Qual sua profissão?',
    securityAnswer: 'MECANICO'
  },
  {
    id: 'usr-3',
    name: 'Janete Silva',
    username: 'janete',
    role: 'Recepção',
    status: 'ATIVO',
    lastLogin: 'Nunca logou',
    deviceRegistered: 'Terminal Recepção',
    password: 'rec1234',
    securityQuestion: 'Qual setor você coordena?',
    securityAnswer: 'RECEPCAO'
  },
  {
    id: 'usr-4',
    name: 'Thiago Rover',
    username: 'thiago',
    role: 'Mecânico',
    status: 'ATIVO',
    lastLogin: 'Nunca logou',
    deviceRegistered: 'Smartphone Oficina (Android)',
    password: 'mec1234',
    securityQuestion: 'Qual a marca do scanner principal?',
    securityAnswer: 'LAUNCH'
  },
  {
    id: 'usr-5',
    name: 'Carlos Mendes',
    username: 'carlos',
    role: 'Estoque',
    status: 'ATIVO',
    lastLogin: 'Nunca logou',
    deviceRegistered: 'Terminal Almoxarifado',
    password: 'est1234',
    securityQuestion: 'Qual setor você opera?',
    securityAnswer: 'ESTOQUE'
  },
  {
    id: 'usr-6',
    name: 'Marcos Oliveira',
    username: 'marcos',
    role: 'Gerente',
    status: 'ATIVO',
    lastLogin: 'Nunca logou',
    deviceRegistered: 'Desktop Gerência',
    password: 'ger1234',
    securityQuestion: 'Qual cargo você ocupa?',
    securityAnswer: 'GERENTE'
  }
];

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [tenant, setTenant] = useState(() => {
    try {
      return localStorage.getItem('kaenpro_last_tenant') || 'rafael';
    } catch {
      return 'rafael';
    }
  });
  const [roomPassword, setRoomPassword] = useState('');
  const [username, setUsername] = useState('rafael');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const getOrCreateDeviceToken = () => {
    let token = localStorage.getItem('kaen_device_token');
    if (!token) {
      token = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('kaen_device_token', token);
    }
    return token;
  };

  const detectDevice = () => {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
    if (/mobile|iphone|ipod|android/i.test(ua)) return 'Celular';
    return 'Computador Desktop';
  };

  const getDeviceLabel = () => {
    const type = detectDevice();
    const ua = navigator.userAgent;
    let os = 'Navegador';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    return `${type} (${os})`;
  };

  const [trustedDevice, setTrustedDevice] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('kaen_trusted_device');
      const token = localStorage.getItem('kaen_device_token');
      if (raw && token) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.deviceId === token) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [rememberDevice, setRememberDevice] = useState(true);
  const [showDirectAccess, setShowDirectAccess] = useState(() => {
    try {
      const raw = localStorage.getItem('kaen_trusted_device');
      const token = localStorage.getItem('kaen_device_token');
      if (raw && token) {
        const parsed = JSON.parse(raw);
        return parsed && parsed.deviceId === token;
      }
      return false;
    } catch {
      return false;
    }
  });

  const [users, setUsers] = useState<AppUser[]>(DEFAULT_USERS);

  // Recovery States
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryUser, setRecoveryUser] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveredPass, setRecoveredPass] = useState('');

  // Room Creation States
  const [showMasterAuthModal, setShowMasterAuthModal] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [masterAuthError, setMasterAuthError] = useState('');
  const [masterAuthorizedPassword, setMasterAuthorizedPassword] = useState('');

  const [showRoomCreator, setShowRoomCreator] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomCreatorError, setRoomCreatorError] = useState('');
  const [roomCreatorSuccess, setRoomCreatorSuccess] = useState('');

  const handleVerifyMasterPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setMasterAuthError('');
    if (masterPasswordInput.trim() === 'enzo1234') {
      setMasterAuthorizedPassword(masterPasswordInput.trim());
      setShowMasterAuthModal(false);
      setMasterPasswordInput('');
      setShowRoomCreator(true);
    } else {
      setMasterAuthError('SENHA MASTER INCORRETA: Acesso exclusivo da Diretoria.');
    }
  };

  useEffect(() => {
    const syncAndLoadUsers = async () => {
      const saved = localStorage.getItem(`kaenpro_${tenant}_admin_users`);
      let loadedUsers = DEFAULT_USERS;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Merge new default sector users (carlos, marcos) if absent in legacy tenant data
            const existingUsernames = new Set(parsed.map((u: AppUser) => u.username.toLowerCase()));
            const missingDefaults = DEFAULT_USERS.filter((d) => !existingUsernames.has(d.username.toLowerCase()));
            loadedUsers = [...parsed, ...missingDefaults];
          }
        } catch {
          loadedUsers = DEFAULT_USERS;
        }
      }
      setUsers(loadedUsers);
      localStorage.setItem('kaenpro_last_tenant', tenant);

      try {
        const res = await fetch(`/api/sync/${tenant}`);
        if (res.ok) {
          const data = await res.json();
          if (data.admin_users && Array.isArray(data.admin_users)) {
            const existingUsernames = new Set(data.admin_users.map((u: AppUser) => u.username.toLowerCase()));
            const missingDefaults = DEFAULT_USERS.filter((d) => !existingUsernames.has(d.username.toLowerCase()));
            const merged = [...data.admin_users, ...missingDefaults];
            setUsers(merged);
            localStorage.setItem(`kaenpro_${tenant}_admin_users`, JSON.stringify(merged));
          }
        }
      } catch {
        // offline fallback
      }
    };

    if (tenant) {
      syncAndLoadUsers();
    }
  }, [tenant]);

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomCreatorError('');
    setRoomCreatorSuccess('');
    setIsCreatingRoom(true);

    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: newRoomId,
          password: newRoomPassword,
          name: newRoomName,
          masterPassword: masterAuthorizedPassword || 'enzo1234'
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          setRoomCreatorError(data.error || 'Erro ao cadastrar unidade.');
        } else {
          setRoomCreatorSuccess(`UNIDADE REGISTRADA! ID: ${newRoomId.toUpperCase()}`);
          setTenant(newRoomId.toLowerCase());
          setRoomPassword(newRoomPassword);
          setTimeout(() => {
            setShowRoomCreator(false);
            setNewRoomId('');
            setNewRoomPassword('');
            setNewRoomName('');
            setRoomCreatorSuccess('');
          }, 1800);
        }
      } else {
        const text = await res.text();
        setRoomCreatorError(`Erro no Servidor [${res.status}]: ${text.substring(0, 150)}`);
      }
    } catch (err: any) {
      setRoomCreatorError(`Erro de Conexão: ${err?.message || 'Sem detalhes'}`);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');

    await new Promise((r) => setTimeout(r, 450));

    if (tenant.trim().toLowerCase() !== 'rafael') {
      try {
        const roomJoinRes = await fetch('/api/rooms/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: tenant.trim().toLowerCase(),
            password: roomPassword
          })
        });

        const joinContentType = roomJoinRes.headers.get('content-type') || '';
        if (joinContentType.includes('application/json') && !roomJoinRes.ok) {
          const roomErr = await roomJoinRes.json();
          setError(`ACESSO BLOQUEADO: ${roomErr.error || 'Unidade ou senha inválidos.'}`);
          setIsLoggingIn(false);
          return;
        }
      } catch (err: any) {
        setError(`ERRO DE REDE: ${err?.message || 'Falha de conexão'}`);
        setIsLoggingIn(false);
        return;
      }
    }

    const checkUser = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!checkUser) {
      setError('USUÁRIO NÃO ENCONTRADO NO CADASTRO DA MM CAR.');
      setIsLoggingIn(false);
      return;
    }

    if (checkUser.status === 'BLOQUEADO') {
      setError('ACESSO BLOQUEADO: CONSULTE A DIRETORIA.');
      setIsLoggingIn(false);
      return;
    }

    if (!password || !password.trim()) {
      setError('SENHA OBRIGATÓRIA: Informe sua chave de acesso.');
      setIsLoggingIn(false);
      return;
    }

    const reqPassword =
      checkUser.password ||
      (checkUser.username === 'rafael'
        ? 'enzo1234'
        : checkUser.username === 'carlos'
        ? 'est1234'
        : checkUser.username === 'marcos'
        ? 'ger1234'
        : checkUser.username === 'janete'
        ? 'rec1234'
        : 'mec1234');

    if (password === reqPassword) {
      const timestamp = new Date().toISOString();
      const clientIp = '192.168.1.' + Math.floor(Math.random() * 200 + 10);
      const activeDeviceName = getDeviceLabel();
      const currentDevToken = getOrCreateDeviceToken();

      if (rememberDevice) {
        const deviceData = {
          deviceId: currentDevToken,
          username: tenant,
          activeUser: checkUser.username,
          realUsername: checkUser.name,
          role: checkUser.role,
          deviceName: activeDeviceName,
          savedAt: timestamp
        };
        localStorage.setItem('kaen_trusted_device', JSON.stringify(deviceData));
        setTrustedDevice(deviceData);
      } else {
        localStorage.removeItem('kaen_trusted_device');
        setTrustedDevice(null);
      }

      const updatedUsers = users.map((u) =>
        u.id === checkUser.id
          ? {
              ...u,
              lastLogin: timestamp,
              deviceRegistered: `${activeDeviceName}${rememberDevice ? ' [Confiável]' : ''}`
            }
          : u
      );
      setUsers(updatedUsers);
      localStorage.setItem(`kaenpro_${tenant}_admin_users`, JSON.stringify(updatedUsers));

      let cloudAccesses: any[] = [];
      let cloudLogs: any[] = [];
      try {
        const syncRes = await fetch(`/api/sync/${tenant}`);
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          cloudAccesses = syncData.admin_accesses || [];
          cloudLogs = syncData.admin_logs || [];
        }
      } catch {
        cloudAccesses = JSON.parse(localStorage.getItem(`kaenpro_${tenant}_admin_accesses`) || '[]');
        cloudLogs = JSON.parse(localStorage.getItem(`kaenpro_${tenant}_admin_logs`) || '[]');
      }

      const newAccess = {
        id: `acc-${Date.now()}`,
        username: checkUser.name,
        role: checkUser.role,
        device: activeDeviceName,
        ip: clientIp,
        location: 'MM Car Auto Center — Unidade Matriz',
        timestamp
      };

      const newAudit = {
        id: `log-${Date.now()}`,
        user: checkUser.name,
        device: activeDeviceName,
        action: `LOGIN ${rememberDevice ? '[APARELHO SALVO]' : ''} (${checkUser.role})`,
        module: 'Sessão de Sistema',
        timestamp
      };

      const updatedAccesses = [newAccess, ...cloudAccesses];
      const updatedLogs = [newAudit, ...cloudLogs];

      localStorage.setItem(`kaenpro_${tenant}_admin_accesses`, JSON.stringify(updatedAccesses));
      localStorage.setItem(`kaenpro_${tenant}_admin_logs`, JSON.stringify(updatedLogs));

      try {
        await fetch(`/api/sync/${tenant}/admin_accesses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedAccesses)
        });
        await fetch(`/api/sync/${tenant}/admin_logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedLogs)
        });
        await fetch(`/api/sync/${tenant}/admin_users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUsers)
        });
      } catch {
        // non-blocking
      }

      onLogin(tenant, checkUser.role, checkUser.name, checkUser.username);
    } else {
      setError('SENHA INCORRETA: Acesso negado.');
      setIsLoggingIn(false);
    }
  };

  const handleQuickTrustedLogin = () => {
    if (!trustedDevice) return;
    setIsLoggingIn(true);
    setTimeout(() => {
      onLogin(
        trustedDevice.username || tenant,
        trustedDevice.role,
        trustedDevice.realUsername || trustedDevice.activeUser,
        trustedDevice.activeUser
      );
    }, 300);
  };

  const handleForgetDevice = () => {
    localStorage.removeItem('kaen_trusted_device');
    setTrustedDevice(null);
    setShowDirectAccess(false);
    setPassword('');
    setError('');
  };

  const selectedRecoveryRecord = users.find((u) => u.username.toLowerCase() === recoveryUser.toLowerCase());

  const handleRecover = () => {
    setRecoveryError('');
    setRecoveredPass('');
    if (!selectedRecoveryRecord) {
      setRecoveryError('USUÁRIO NÃO RECONHECIDO.');
      return;
    }

    const defaultAns = selectedRecoveryRecord.securityAnswer || 'MM CAR';
    if (recoveryAnswer.trim().toUpperCase() === defaultAns.toUpperCase()) {
      const recoveryKey =
        selectedRecoveryRecord.password ||
        (selectedRecoveryRecord.username === 'rafael' ? 'enzo1234' : 'mec1234');
      setRecoveredPass(recoveryKey);
    } else {
      setRecoveryError('RESPOSTA DE SEGURANÇA INCORRETA.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,rgba(255,45,85,0.06)_0%,transparent_70%)] pointer-events-none" />

      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 md:top-10 md:left-10 text-zinc-600 hover:text-white transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] italic z-50 group cursor-pointer whitespace-nowrap"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> VOLTAR AO INÍCIO
      </button>

      <div className="w-full max-w-md space-y-8 flex flex-col items-center relative z-10 py-10">
        <div className="text-center space-y-2 flex flex-col items-center">
          <MMCarLogo variant="horizontal" className="h-14 sm:h-16 w-auto drop-shadow-xl" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.35em] italic">
            AUTENTICAÇÃO POR SETOR
          </p>
        </div>

        <div className="w-full glass-card p-6 sm:p-10 rounded-[2.5rem] relative overflow-hidden border border-white/10 shadow-2xl">
          {isLoggingIn && (
            <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl z-20 flex flex-col items-center justify-center gap-5 p-6 text-center">
              <RefreshCw size={40} className="text-[#FF2D55] animate-spin" />
              <p className="text-xs font-black text-white uppercase tracking-[0.3em] italic">
                Carregando Setor MM Car...
              </p>
            </div>
          )}

          {trustedDevice && showDirectAccess ? (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-2xl flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <span className="text-[8px] font-black uppercase tracking-[0.25em] text-emerald-400 block">
                    DISPOSITIVO CONFIÁVEL
                  </span>
                  <p className="text-xs text-zinc-200 font-bold mt-0.5">{trustedDevice.deviceName || getDeviceLabel()}</p>
                </div>
              </div>

              <div className="p-6 bg-zinc-950/90 border border-white/10 rounded-3xl text-left space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#FF2D55] text-white flex items-center justify-center text-lg font-black uppercase italic shadow-lg shrink-0">
                    {(trustedDevice.realUsername || trustedDevice.activeUser || 'MM').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block">
                      Sessão Autorizada
                    </span>
                    <h3 className="text-base font-black text-white uppercase italic truncate">
                      {trustedDevice.realUsername || trustedDevice.activeUser}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 border border-white/10">
                        {trustedDevice.role}
                      </span>
                      <span className="text-[8px] text-zinc-400 uppercase tracking-wider">
                        MM Car Auto Center
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleQuickTrustedLogin}
                  className="w-full bg-[#FF2D55] hover:bg-[#ff1744] py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.35em] text-white flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,45,85,0.35)] italic cursor-pointer"
                >
                  <span>ENTRAR NESTE TERMINAL</span>
                  <ArrowRight size={16} />
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDirectAccess(false);
                      setPassword('');
                      setError('');
                    }}
                    className="py-3 px-3 bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-white/15 rounded-xl text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock size={12} /> Trocar Operador
                  </button>

                  <button
                    type="button"
                    onClick={handleForgetDevice}
                    className="py-3 px-3 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider text-red-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={12} /> Esquecer Aparelho
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {!trustedDevice ? (
                <div className="bg-amber-500/10 border border-amber-500/25 p-3.5 rounded-2xl flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-400 block">
                      CONTROLE MULTI-SETOR
                    </span>
                    <p className="text-[10px] text-zinc-300 font-medium">
                      Selecione seu setor e informe sua senha pessoal de operador.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center pb-1">
                  <button
                    type="button"
                    onClick={() => setShowDirectAccess(true)}
                    className="text-[9px] font-black text-[#FF2D55] uppercase tracking-widest hover:underline flex items-center gap-1.5 italic cursor-pointer"
                  >
                    <ArrowLeft size={12} /> VOLTAR AO ACESSO RÁPIDO
                  </button>
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">{getDeviceLabel()}</span>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-[10px] p-4 rounded-2xl text-center font-black uppercase tracking-wider italic">
                  {error}
                </div>
              )}

              <div className="p-4 bg-zinc-950/90 border border-white/10 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-[#FF2D55]/15 border border-[#FF2D55]/30 flex items-center justify-center text-[#FF2D55] shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-[0.25em] text-[#FF2D55] block">
                      UNIDADE CONECTADA
                    </span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">MM CAR AUTO CENTER</h4>
                    <span className="text-[9px] text-zinc-500 font-mono">Gestão Empresarial Integrada</span>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                  ONLINE
                </span>
              </div>

              {/* Quick Sector Profile Selector */}
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-2 text-left block italic">
                  SETOR DE OPERAÇÃO
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-zinc-950/80 p-1.5 border border-white/5 rounded-2xl">
                  {[
                    { username: 'rafael', label: 'Diretoria', role: 'Admin' },
                    { username: 'janete', label: 'Recepção', role: 'Pátio' },
                    { username: 'eduardo', label: 'Mecânico', role: 'Box' },
                    { username: 'carlos', label: 'Estoque', role: 'Peças' }
                  ].map((it) => {
                    const isSel = username.toLowerCase() === it.username;
                    return (
                      <button
                        key={it.username}
                        type="button"
                        onClick={() => {
                          setUsername(it.username);
                          setPassword('');
                          setError('');
                        }}
                        className={`py-2.5 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center cursor-pointer
                        ${isSel ? 'bg-white text-black font-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <span className="text-[10px] uppercase font-black tracking-tight leading-none">{it.label}</span>
                        <span className={`text-[8px] mt-0.5 ${isSel ? 'text-zinc-600' : 'text-zinc-500'}`}>{it.role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-2 text-left block italic">
                  CÓDIGO DO OPERADOR
                </label>
                <input
                  type="text"
                  required
                  placeholder="EX: RAFAEL, JANETE, EDUARDO, CARLOS"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-3.5 text-white text-center focus:border-[#FF2D55]/50 outline-none transition-all font-black text-xs uppercase tracking-widest"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] italic">
                    SENHA DE ACESSO
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(true)}
                    className="text-[#FF2D55] text-[9px] font-bold uppercase tracking-widest italic hover:underline cursor-pointer"
                  >
                    RECUPERAR SENHA
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="DIGITE SUA SENHA"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-center focus:border-[#FF2D55]/50 outline-none transition-all font-black text-xs tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div
                onClick={() => setRememberDevice(!rememberDevice)}
                className="flex items-start gap-3 p-3.5 bg-zinc-950/70 border border-white/5 hover:border-white/15 rounded-2xl cursor-pointer transition-all select-none text-left"
              >
                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors mt-0.5
                  ${rememberDevice ? 'bg-[#FF2D55] border-[#FF2D55] text-white' : 'bg-black border-white/20'}`}
                >
                  {rememberDevice && <CheckCircle2 size={14} />}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9.5px] font-black uppercase tracking-wider text-zinc-200">
                    Salvar este dispositivo como confiável
                  </p>
                  <p className="text-[8.5px] text-zinc-500 leading-tight">
                    Libera acesso rápido neste terminal após autenticação inicial.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#FF2D55] hover:bg-[#ff1744] py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.35em] text-white flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,45,85,0.35)] italic cursor-pointer"
              >
                <Lock size={15} />
                <span>ACESSAR SISTEMA</span>
              </button>

              <div className="pt-2 text-center border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setMasterPasswordInput('');
                    setMasterAuthError('');
                    setShowMasterAuthModal(true);
                  }}
                  className="text-zinc-600 hover:text-zinc-400 text-[8.5px] font-black uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-1.5 mx-auto py-1 cursor-pointer"
                >
                  <Lock size={11} />
                  <span>Registrar Nova Filial (Diretoria)</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* RECOVERY MODAL */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="w-full max-w-md bg-[#0D0D0E] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative">
            <div className="text-center space-y-4 mb-6">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <Key size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black italic uppercase text-white tracking-widest">RECUPERAÇÃO DE ACESSO</h3>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                  Protocolo interno MM Car Auto Center
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2 text-left">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Operador</label>
                <select
                  value={recoveryUser}
                  onChange={(e) => {
                    setRecoveryUser(e.target.value);
                    setRecoveryAnswer('');
                    setRecoveredPass('');
                    setRecoveryError('');
                  }}
                  className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white text-xs font-black uppercase outline-none"
                >
                  <option value="">-- SELECIONE SEU NOME --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.username}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {selectedRecoveryRecord && (
                <div className="space-y-3 p-4 bg-zinc-950 border border-white/5 rounded-2xl text-left">
                  <div>
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block">
                      PERGUNTA DE SEGURANÇA:
                    </span>
                    <p className="text-xs font-black text-white uppercase italic mt-1">
                      {selectedRecoveryRecord.securityQuestion || 'Qual o nome da oficina principal?'}
                    </p>
                  </div>
                  <input
                    type="text"
                    placeholder="SUA RESPOSTA"
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-black uppercase outline-none"
                  />
                </div>
              )}

              {recoveryError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-3 rounded-xl text-center font-black uppercase">
                  {recoveryError}
                </div>
              )}

              {recoveredPass && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center p-4 rounded-2xl space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest block">CHAVE RECUPERADA</span>
                  <div className="text-xl font-mono font-black tracking-widest bg-black p-3 rounded-lg text-white border border-emerald-500/30">
                    {recoveredPass}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRecoveryModal(false)}
                  className="flex-1 bg-zinc-900 text-zinc-400 py-3 rounded-xl font-bold uppercase text-[9px] tracking-widest hover:text-white border border-white/5 cursor-pointer"
                >
                  FECHAR
                </button>
                {selectedRecoveryRecord && !recoveredPass && (
                  <button
                    onClick={handleRecover}
                    className="flex-1 bg-amber-500 text-black py-3 rounded-xl font-black uppercase text-[9px] tracking-widest cursor-pointer"
                  >
                    REVELAR SENHA
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MASTER AUTH MODAL */}
      {showMasterAuthModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="w-full max-w-md bg-[#0D0D0E] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
            <div className="text-center space-y-3 mb-6">
              <div className="w-12 h-12 bg-[#FF2D55]/10 text-[#FF2D55] border border-[#FF2D55]/20 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-lg font-black italic uppercase text-white tracking-widest">AUTORIZAÇÃO MASTER</h3>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                Informe a senha da Diretoria para cadastrar nova filial.
              </p>
            </div>

            <form onSubmit={handleVerifyMasterPassword} className="space-y-4">
              <input
                type="password"
                required
                autoFocus
                placeholder="SENHA MASTER"
                value={masterPasswordInput}
                onChange={(e) => setMasterPasswordInput(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none text-center"
              />
              {masterAuthError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-3 rounded-xl text-center font-black uppercase">
                  {masterAuthError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowMasterAuthModal(false)}
                  className="flex-1 bg-zinc-900 text-zinc-400 py-3 rounded-xl font-bold uppercase text-[9px] cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#FF2D55] text-white py-3 rounded-xl font-black uppercase text-[9px] cursor-pointer"
                >
                  AUTORIZAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROOM CREATOR MODAL */}
      {showRoomCreator && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="w-full max-w-md bg-[#0D0D0E] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
            <div className="text-center space-y-3 mb-6">
              <div className="w-12 h-12 bg-[#FF2D55]/10 text-[#FF2D55] border border-[#FF2D55]/20 rounded-2xl flex items-center justify-center mx-auto">
                <Wrench size={24} />
              </div>
              <h3 className="text-lg font-black italic uppercase text-white tracking-widest">NOVA UNIDADE MM CAR</h3>
            </div>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
              <input
                type="text"
                required
                placeholder="NOME DA UNIDADE (EX: MM CAR FILIAL 02)"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value.toUpperCase())}
                className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white text-xs font-black uppercase outline-none"
              />
              <input
                type="text"
                required
                placeholder="ID DA UNIDADE (EX: mmcar_filial2)"
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''))}
                className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none"
              />
              <input
                type="password"
                required
                placeholder="SENHA DA UNIDADE"
                value={newRoomPassword}
                onChange={(e) => setNewRoomPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none text-center"
              />

              {roomCreatorError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-3 rounded-xl text-center font-black uppercase">
                  {roomCreatorError}
                </div>
              )}

              {roomCreatorSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center p-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2">
                  <CheckCircle size={14} />
                  <span>{roomCreatorSuccess}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRoomCreator(false)}
                  className="flex-1 bg-zinc-900 text-zinc-400 py-3 rounded-xl font-bold uppercase text-[9px] cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="flex-1 bg-[#FF2D55] text-white py-3 rounded-xl font-black uppercase text-[9px] cursor-pointer"
                >
                  {isCreatingRoom ? 'CRIANDO...' : 'CADASTRAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
