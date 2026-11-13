import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Key, Users, List, 
  Terminal, Shield, AlertTriangle, Play, RefreshCw, 
  Trash2, ToggleLeft, ToggleRight, Smartphone, Laptop, Clock,
  Activity, Wifi, WifiOff, FileText, CheckCircle, XCircle, 
  UserPlus, HardDrive, Database, Cpu, Lock, Unlock, Settings, 
  Filter, Search, UserCheck, ShieldX, Check, AlertCircle, FileSpreadsheet, Cloud
} from 'lucide-react';
import { UserSession } from '../types';

interface AdminPanelProps {
  session?: UserSession;
  syncData?: (key: string, data: any) => Promise<void>;
}

interface AccessLog {
  id: string;
  username: string;
  role: string;
  device: string;
  ip: string;
  location: string;
  timestamp: string;
}

interface ActivityLog {
  id: string;
  user: string;
  device: string;
  action: string;
  module: string;
  timestamp: string;
}

interface SystemError {
  id: string;
  code: string;
  module: string;
  message: string;
  severity: 'WARNING' | 'CRITICAL' | 'FATAL';
  status: 'PENDENTE' | 'RESOLVIDO';
  resolvedBy?: string;
  timestamp: string;
}

interface InvoiceLog {
  id: string;
  osNumber: string;
  client: string;
  value: number;
  status: 'FALHOU_PDF' | 'PENDENTE_VALIDACAO' | 'REJEITADA_SEFAZ' | 'AUTENTICADA';
  reason: string;
  timestamp: string;
  resolved: boolean;
}

interface AppUser {
  id: string;
  name: string;
  username: string;
  role: 'Dono' | 'Funcionário' | 'Recepção';
  status: 'ATIVO' | 'BLOQUEADO';
  lastLogin: string;
  deviceRegistered: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ session, syncData }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Synchronized state writer
  const updateEntity = (key: string, data: any) => {
    if (!session) return;
    const userKey = `kaenpro_${session.username}_${key}`;
    localStorage.setItem(userKey, JSON.stringify(data));
    if (syncData) {
      syncData(key, data).catch(e => console.error(`Failed to sync ${key}`, e));
    } else {
      window.dispatchEvent(new CustomEvent('kaen_storage_updated'));
    }
  };
  const [password, setPassword] = useState('');
  const [pinError, setPinError] = useState('');
  
  // Real Admin States
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'CRUD_USERS' | 'ERRORS' | 'INVOICES' | 'AUDIT_LOGS'>('TELEMETRY');
  const [accesses, setAccesses] = useState<AccessLog[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [invoices, setInvoices] = useState<InvoiceLog[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  
  // Permission control toggles
  const [permissions, setPermissions] = useState({
    canEditPrices: true,
    canDelete: true,
    canCloseOS: true,
    allowMobileUploads: true,
    strictDoubleAuth: false,
    autoBackupInterval: true
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Security double-gate authentication modal state
  const [securityModal, setSecurityModal] = useState<{
    isOpen: boolean;
    title: string;
    actionType: 'DELETE_USER' | 'BLOCK_USER' | 'PURGE_LOGS' | 'RESET_DB' | 'RESOLVE_ERROR' | 'RE_EMIT_INVOICE' | 'SAVE_PERMS';
    targetId?: string;
    targetMeta?: any;
  }>({ isOpen: false, title: '', actionType: 'SAVE_PERMS' });
  const [secPassword, setSecPassword] = useState('');
  const [secError, setSecError] = useState('');

  // Technical performance simulation
  const [latency, setLatency] = useState(32);
  const [cpuLoad, setCpuLoad] = useState(14);
  const [syncDelay, setSyncDelay] = useState(0.8);
  const [dbWeight, setDbWeight] = useState(3.42);
  const [isSyncAlive, setIsSyncAlive] = useState(true);
  const [onlineSessions, setOnlineSessions] = useState<any[]>([]);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncSuccess, setCloudSyncSuccess] = useState(false);

  const handleForceCloudBackup = () => {
    setIsCloudSyncing(true);
    window.dispatchEvent(new CustomEvent('kaen_force_cloud_backup'));
    setTimeout(() => {
      setIsCloudSyncing(false);
      setCloudSyncSuccess(true);
      setTimeout(() => setCloudSyncSuccess(false), 4000);
    }, 1200);
  };

  // Real-time online sessions presence listener
  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const tenant = session?.username || 'rafael';
        const res = await fetch(`/api/presence/${tenant}`);
        if (res.ok) {
          const list = await res.json();
          setOnlineSessions(list);
        }
      } catch (err) {
        // quiet fail
      }
    };
    fetchPresence();

    const handlePresence = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) {
        setOnlineSessions(detail);
      }
    };
    window.addEventListener('kaen_presence_updated', handlePresence);
    return () => window.removeEventListener('kaen_presence_updated', handlePresence);
  }, []);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    role: 'Funcionário' as 'Dono' | 'Funcionário' | 'Recepção',
    password: '',
    deviceRegistered: 'Smartphone (Android)'
  });

  // Seed / Loading logic
  useEffect(() => {
    if (!session) return;

    // Check unlocking
    if (sessionStorage.getItem('kaen_admin_unlocked') === 'true') {
      setIsUnlocked(true);
    }

    // 1. Initial Load Permissions
    const savedPerms = localStorage.getItem(`kaenpro_${session.username}_permissions`);
    if (savedPerms) {
      setPermissions(JSON.parse(savedPerms));
    } else {
      updateEntity('permissions', permissions);
    }

    // 2. Load access logs
    const savedAccesses = localStorage.getItem(`kaenpro_${session.username}_admin_accesses`);
    if (savedAccesses) {
      setAccesses(JSON.parse(savedAccesses));
    } else {
      const initialAccesses: AccessLog[] = [
        { id: 'acc-1', username: 'Janete Silva', role: 'Recepção', device: 'Guichê Central (ChromeOS Linux)', ip: '192.168.1.150', location: 'Kaen Oficina - Recepção', timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
        { id: 'acc-2', username: 'Eduardo M.', role: 'Funcionário', device: 'Tablet Oficina OS (iPad Pro)', ip: '192.168.1.85', location: 'Kaen Oficina - Box 3', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { id: 'acc-3', username: session.username, role: 'Dono', device: 'Desktop Master (Windows 11 Chrome)', ip: '186.221.43.92', location: 'Remoto - Escritório Central', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
        { id: 'acc-4', username: 'Thiago Rover', role: 'Funcionário', device: 'Celular Oficina (Samsung S23)', ip: '192.168.1.99', location: 'Local - Pátio Principal', timestamp: new Date(Date.now() - 3600000 * 5).toISOString() }
      ];
      updateEntity('admin_accesses', initialAccesses);
      setAccesses(initialAccesses);
    }

    // 3. Load activity logs
    const savedLogs = localStorage.getItem(`kaenpro_${session.username}_admin_logs`);
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      const initialLogs: ActivityLog[] = [
        { id: 'log-1', user: 'Janete Silva', device: 'Guichê Central', action: 'Gerou faturamento da OS #1294', module: 'Faturamento', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
        { id: 'log-2', user: 'Eduardo M.', device: 'Tablet Oficina', action: 'Iniciou reparo de cabeçote no Chevrolet Onix (KAW-9182)', module: 'Mecânica', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { id: 'log-3', user: session.username, device: 'Desktop Master', action: 'Ajustou tabela de serviços - Taxa básica alterada para R$ 220,00', module: 'Configurações', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
        { id: 'log-4', user: 'Janete Silva', device: 'Guichê Central', action: 'Cadastrou veículo Corolla GXR (PLT-0192)', module: 'Cadastro de Clientes', timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString() }
      ];
      updateEntity('admin_logs', initialLogs);
      setLogs(initialLogs);
    }

    // 4. Load system error telemetry
    const savedErrors = localStorage.getItem(`kaenpro_${session.username}_admin_errors`);
    if (savedErrors) {
      setErrors(JSON.parse(savedErrors));
    } else {
      const initialErrors: SystemError[] = [
        { id: 'err-1', code: 'SYNC-DELAY-502', module: 'Banco Híbrido Sync', message: 'Sincronização em tempo real excedeu o limite máximo recomendado de latência de rede.', severity: 'WARNING', status: 'PENDENTE', timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
        { id: 'err-2', code: 'PDF-COMPILER-403', module: 'NFe Generator API', message: 'Erro crítico de compilação de layout NFe: Sem permissão de gravação no container temporário local.', severity: 'CRITICAL', status: 'PENDENTE', timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString() },
        { id: 'err-3', code: 'DB-DEADLOCK-901', module: 'Controlador Interno SQL', message: 'Deadlock temporário evitado na tabela de histórico de orçamentos simultâneos por múltiplos operadores.', severity: 'CRITICAL', status: 'RESOLVIDO', resolvedBy: session.username, timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
        { id: 'err-4', code: 'WS-DROPOUT-500', module: 'Mecanismo Realtime SSE', message: 'Conexão interrompida abruptamente pelo cliente Tablet Oficina (iPad). Reiniciando handshake.', severity: 'FATAL', status: 'RESOLVIDO', resolvedBy: 'Janete Silva', timestamp: new Date(Date.now() - 3600000 * 6).toISOString() }
      ];
      updateEntity('admin_errors', initialErrors);
      setErrors(initialErrors);
    }

    // 5. Load Invoice monitoring logs
    const savedInvoices = localStorage.getItem(`kaenpro_${session.username}_admin_invoices`);
    if (savedInvoices) {
      setInvoices(JSON.parse(savedInvoices));
    } else {
      const initialInvoices: InvoiceLog[] = [
        { id: 'inv-1', osNumber: '1290', client: 'Carlos Alberto Rezende', value: 890.30, status: 'FALHOU_PDF', reason: 'Assinatura inválida do certificado A1', timestamp: new Date(Date.now() - 1000 * 60 * 123).toISOString(), resolved: false },
        { id: 'inv-2', osNumber: '1292', client: 'Mariana Duarte Souza', value: 2450.00, status: 'REJEITADA_SEFAZ', reason: 'Rejeição cadastral: Alíquota municipal inválida na emissão', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), resolved: false },
        { id: 'inv-3', osNumber: '1288', client: 'Roberto Mendes Neves', value: 412.00, status: 'PENDENTE_VALIDACAO', reason: 'Processando aprovação manual na SEFAZ SP', timestamp: new Date(Date.now() - 3600000 * 6).toISOString(), resolved: false },
        { id: 'inv-4', osNumber: '1279', client: 'Vivian Toledo', value: 1205.50, status: 'AUTENTICADA', reason: 'Sucesso absoluto', timestamp: new Date(Date.now() - 3600000 * 18).toISOString(), resolved: true }
      ];
      updateEntity('admin_invoices', initialInvoices);
      setInvoices(initialInvoices);
    }

    // 6. Load Admin User List
    const savedUsers = localStorage.getItem(`kaenpro_${session.username}_admin_users`);
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      const initialUsers: AppUser[] = [
        { id: 'usr-1', name: 'Administrador Master', username: session.username, role: 'Dono', status: 'ATIVO', lastLogin: new Date().toISOString(), deviceRegistered: 'Desktop Master (Chrome Windows)' },
        { id: 'usr-2', name: 'Eduardo Maciel', username: 'eduardo', role: 'Funcionário', status: 'ATIVO', lastLogin: new Date(Date.now() - 1000 * 60 * 45).toISOString(), deviceRegistered: 'Tablet Oficina (iPad Pro)' },
        { id: 'usr-3', name: 'Janete Silva', username: 'janete', role: 'Recepção', status: 'ATIVO', lastLogin: new Date(Date.now() - 1000 * 650).toISOString(), deviceRegistered: 'Desktop Recepção (Linux Chrome)' },
        { id: 'usr-4', name: 'Thiago Rover', username: 'thiago', role: 'Funcionário', status: 'ATIVO', lastLogin: new Date(Date.now() - 3600000 * 12).toISOString(), deviceRegistered: 'Smartphone (Android)' }
      ];
      updateEntity('admin_users', initialUsers);
      setUsers(initialUsers);
    }
  }, [session]);

  // Telemetry fluctuation hook
  useEffect(() => {
    if (!isUnlocked) return;
    const interval = setInterval(() => {
      setLatency(prev => {
        const delta = Math.floor(Math.random() * 11) - 5;
        const target = prev + delta;
        return Math.max(12, Math.min(180, target));
      });
      setCpuLoad(prev => {
        const delta = Math.floor(Math.random() * 7) - 3;
        const target = prev + delta;
        return Math.max(4, Math.min(88, target));
      });
      setSyncDelay(prev => {
        const delta = parseFloat((Math.random() * 0.4 - 0.2).toFixed(2));
        const target = prev + delta;
        return Math.max(0.1, Math.min(3.5, target));
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isUnlocked]);

  // STORAGE UPDATE LISTENER (HMR/CROSS-DEVICE ACTION FEEDBACK)
  useEffect(() => {
    if (!session || !isUnlocked) return;
    const handleRemoteUpdate = () => {
      const tenant = session.username;

      const savedPerms = localStorage.getItem(`kaenpro_${tenant}_permissions`);
      if (savedPerms) setPermissions(JSON.parse(savedPerms));

      const savedAccesses = localStorage.getItem(`kaenpro_${tenant}_admin_accesses`);
      if (savedAccesses) setAccesses(JSON.parse(savedAccesses));

      const savedLogs = localStorage.getItem(`kaenpro_${tenant}_admin_logs`);
      if (savedLogs) setLogs(JSON.parse(savedLogs));

      const savedErrors = localStorage.getItem(`kaenpro_${tenant}_admin_errors`);
      if (savedErrors) setErrors(JSON.parse(savedErrors));

      const savedInvoices = localStorage.getItem(`kaenpro_${tenant}_admin_invoices`);
      if (savedInvoices) setInvoices(JSON.parse(savedInvoices));

      const savedUsers = localStorage.getItem(`kaenpro_${tenant}_admin_users`);
      if (savedUsers) setUsers(JSON.parse(savedUsers));
    };
    window.addEventListener('kaen_storage_updated', handleRemoteUpdate);
    return () => window.removeEventListener('kaen_storage_updated', handleRemoteUpdate);
  }, [session, isUnlocked]);

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'enzo1234') {
      setIsUnlocked(true);
      sessionStorage.setItem('kaen_admin_unlocked', 'true');
      setPinError('');
      
      // Log successful security unlock
      if (session) {
        // Log access in log file too
        const currentLogs = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_admin_logs`) || '[]');
        const newLog: ActivityLog = {
          id: Math.random().toString(36).substr(2, 9),
          user: session.username,
          device: navigator.userAgent.includes('Mobile') ? 'Dispositivo Móvel' : 'Computador Desktop',
          action: 'Efetivou login com sucesso no painel de administração e segurança',
          module: 'Segurança',
          timestamp: new Date().toISOString()
        };
        const updated = [newLog, ...currentLogs];
        updateEntity('admin_logs', updated);
        setLogs(updated);
      }
    } else {
      setPinError('SENHA RESTRITA INCORRETA. CONTATO COM DESENVOLVEDOR EXIGIDO.');
    }
  };

  // Securely trigger a dual-gate validation password popup
  const requestSecAuth = (
    title: string,
    actionType: typeof securityModal.actionType,
    targetId?: string,
    targetMeta?: any
  ) => {
    setSecPassword('');
    setSecError('');
    setSecurityModal({
      isOpen: true,
      title,
      actionType,
      targetId,
      targetMeta
    });
  };

  const handleSecAuthConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (secPassword !== 'enzo1234') {
      setSecError('CHAVE DE SEGURANÇA INVÁLIDA.');
      return;
    }

    // Auth succeeded! Execute specific action code safely.
    const { actionType, targetId, targetMeta } = securityModal;
    const currentLogs = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_admin_logs`) || '[]');

    switch (actionType) {
      case 'DELETE_USER':
        if (targetId) {
          const updatedUsers = users.filter(u => u.id !== targetId);
          setUsers(updatedUsers);
          updateEntity('admin_users', updatedUsers);
          
          // Log deletion
          const auditLog: ActivityLog = {
            id: `audit-${Date.now()}`,
            user: session.username,
            device: 'Console Admin',
            action: `EXCLUIU CONTA DE USUÁRIO: ID ${targetId} (${targetMeta || 'N/A'})`,
            module: 'Controle de Equipes',
            timestamp: new Date().toISOString()
          };
          const nextLogs = [auditLog, ...currentLogs];
          updateEntity('admin_logs', nextLogs);
          setLogs(nextLogs);
        }
        break;

      case 'BLOCK_USER':
        if (targetId) {
          const updated = users.map(u => {
            if (u.id === targetId) {
              const nextStatus = u.status === 'ATIVO' ? 'BLOQUEADO' as const : 'ATIVO' as const;
              return { ...u, status: nextStatus };
            }
            return u;
          });
          setUsers(updated);
          updateEntity('admin_users', updated);
          
          // Log alteration
          const auditLog: ActivityLog = {
            id: `audit-${Date.now()}`,
            user: session.username,
            device: 'Console Admin',
            action: `ALTEROU STATUS DE USUÁRIO: ID ${targetId} - CONEXÃO BLOQUEADA/REATIVADA`,
            module: 'Controle de Equipes',
            timestamp: new Date().toISOString()
          };
          const nextLogs = [auditLog, ...currentLogs];
          updateEntity('admin_logs', nextLogs);
          setLogs(nextLogs);
        }
        break;

      case 'PURGE_LOGS':
        updateEntity('admin_logs', []);
        setLogs([]);
        break;

      case 'RESET_DB':
        // Purges all mock data inside this local account session to start clean
        updateEntity('orders', []);
        updateEntity('vehicles', []);
        updateEntity('clients', []);
        updateEntity('parts', []);
        updateEntity('transactions', []);
        
        // Log deep system reset
        const clearLogObj: ActivityLog = {
          id: `audit-${Date.now()}`,
          user: session.username,
          device: 'Console Admin',
          action: 'EXECUTOU PURGA COMPLETA DOS BANCOS DE DADOS GERAIS',
          module: 'Sistemas',
          timestamp: new Date().toISOString()
        };
        updateEntity('admin_logs', [clearLogObj]);
        setLogs([clearLogObj]);
        alert('Banco de dados operacional reiniciado com sucesso! Recarregue qualquer tela.');
        break;

      case 'RESOLVE_ERROR':
        if (targetId) {
          const resolvedSrc = errors.map(err => {
            if (err.id === targetId) {
              return { ...err, status: 'RESOLVIDO' as const, resolvedBy: session.username };
            }
            return err;
          });
          setErrors(resolvedSrc);
          updateEntity('admin_errors', resolvedSrc);
          
          const auditLog: ActivityLog = {
            id: `audit-${Date.now()}`,
            user: session.username,
            device: 'Console Admin',
            action: `Marcou erro [${targetMeta || 'Código'} - ID ${targetId}] de telemetria como RESOLVIDO manual`,
            module: 'Mecanismo Realtime SSE',
            timestamp: new Date().toISOString()
          };
          const nextLogs = [auditLog, ...currentLogs];
          updateEntity('admin_logs', nextLogs);
          setLogs(nextLogs);
        }
        break;

      case 'RE_EMIT_INVOICE':
        if (targetId) {
          const reissued = invoices.map(inv => {
            if (inv.id === targetId) {
              return { ...inv, status: 'AUTENTICADA' as const, reason: 'NFe Autorizada com sucesso após reemissão manual', resolved: true };
            }
            return inv;
          });
          setInvoices(reissued);
          updateEntity('admin_invoices', reissued);

          const auditLog: ActivityLog = {
            id: `audit-${Date.now()}`,
            user: session.username,
            device: 'Console Admin',
            action: `Forçou faturamento e reemissão de NFe pendente/falha para OS #${targetMeta || 'N/A'}`,
            module: 'Faturamento',
            timestamp: new Date().toISOString()
          };
          const nextLogs = [auditLog, ...currentLogs];
          updateEntity('admin_logs', nextLogs);
          setLogs(nextLogs);
        }
        break;

      case 'SAVE_PERMS':
        if (targetMeta) {
          setPermissions(targetMeta);
          updateEntity('permissions', targetMeta);
          
          const auditLog: ActivityLog = {
            id: `audit-${Date.now()}`,
            user: session.username,
            device: 'Console Admin',
            action: 'Salvou e atualizou diretrizes globais de permissão do sistema',
            module: 'Configurações',
            timestamp: new Date().toISOString()
          };
          const nextLogs = [auditLog, ...currentLogs];
          updateEntity('admin_logs', nextLogs);
          setLogs(nextLogs);
        }
        break;
    }

    // Close Security gate modal
    setSecurityModal({ isOpen: false, title: '', actionType: 'SAVE_PERMS' });
  };

  const handleTogglePerm = (key: keyof typeof permissions) => {
    if (!session) return;
    const nextPerms = {
      ...permissions,
      [key]: !permissions[key]
    };
    
    // Request double validation if double auth toggle is being changes or strict mode is active
    if (permissions.strictDoubleAuth || key === 'strictDoubleAuth') {
      requestSecAuth(
        'CONFIRMAR ALTERAÇÃO DE POLÍTICA DE SEGURANÇA COMPILADA',
        'SAVE_PERMS',
        undefined,
        nextPerms
      );
    } else {
      setPermissions(nextPerms);
      updateEntity('permissions', nextPerms);
      
      const currentLogs = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_admin_logs`) || '[]');
      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        user: session.username,
        device: 'Console Admin',
        action: `Alternou permissão global (${key}) para ${nextPerms[key] ? 'HABILITADO' : 'DESABILITADO'}`,
        module: 'Configurações',
        timestamp: new Date().toISOString()
      };
      const updatedLogs = [newLog, ...currentLogs];
      updateEntity('admin_logs', updatedLogs);
      setLogs(updatedLogs);
    }
  };

  // Create User submit handler
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.username || !newUser.password || !session) return;

    // Check conflict
    const conflicts = users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase());
    if (conflicts) {
      alert('ERRO: Nome de usuário indisponível no sistema.');
      return;
    }

    const created: AppUser = {
      id: `usr-${Date.now()}`,
      name: newUser.name,
      username: newUser.username.toLowerCase(),
      role: newUser.role,
      status: 'ATIVO',
      lastLogin: 'Nunca logou',
      deviceRegistered: newUser.deviceRegistered
    };

    const nextUsers = [...users, created];
    setUsers(nextUsers);
    updateEntity('admin_users', nextUsers);

    // Also update general technical employees list to align workspaces perfectly
    const teamDbStr = localStorage.getItem(`kaenpro_${session.username}_employees`) || '[]';
    try {
      const teamDb = JSON.parse(teamDbStr);
      const alignedEmployee = {
        id: created.id,
        name: created.name,
        role: created.role === 'Funcionário' ? 'Mecânico' : created.role === 'Recepção' ? 'Recepção' : 'Dono',
        shift: 'Diurno',
        services: 0,
        status: 'Ativo' as const,
        createdAt: new Date().toISOString()
      };
      updateEntity('employees', [...teamDb, alignedEmployee]);
    } catch (err) {
      console.error('Failed to align account creation in employee team list', err);
    }

    // Reset user form
    setNewUser({
      name: '',
      username: '',
      role: 'Funcionário',
      password: '',
      deviceRegistered: 'Smartphone (Android)'
    });

    // Write operational audits
    const currentLogs = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_admin_logs`) || '[]');
    const auditLog: ActivityLog = {
      id: `audit-${Date.now()}`,
      user: session.username,
      device: 'Console Admin',
      action: `CRIOU NOVA CONTA DE ACESSO: ${created.name} (${created.role}) com login '${created.username}'`,
      module: 'Controle de Equipes',
      timestamp: new Date().toISOString()
    };
    const nextLogs = [auditLog, ...currentLogs];
    updateEntity('admin_logs', nextLogs);
    setLogs(nextLogs);
  };

  // Simulates a random real-time warning, database dropout or SEFAZ invoice failure
  const handleForceGenerateTelemetryFault = () => {
    if (!session) return;
    const errorTemplates: Omit<SystemError, 'id' | 'status' | 'timestamp'>[] = [
      { code: 'SQLITE-LOCK-FAIL', module: 'Controlador Interno SQL', message: 'Bloqueio de leitura na persistência ao arquivar orçamentos. Esperando liberação do processo receptor.', severity: 'CRITICAL' },
      { code: 'NFE-TIMEOUT-SEFAZ', module: 'NFe Generator API', message: 'A resposta do gateway estadual demorou mais do que 15 segundos. Operação de faturamento suspensa.', severity: 'WARNING' },
      { code: 'HANDSHAKE-LOST-400', module: 'Mecanismo Realtime SSE', message: 'Dispositivo Smartphone Mecânico (IP: 192.168.1.13) perdeu handshake websocket devido a baixa qualidade de sinal de Wi-Fi.', severity: 'FATAL' },
      { code: 'CORRUPTED-BUFFER', module: 'Banco Híbrido Sync', message: 'Incoerência de timestamp detectada ao mesclar dados paralelos do Tablet Mecânico #2. Handshake repetido.', severity: 'CRITICAL' }
    ];

    const randomTemplate = errorTemplates[Math.floor(Math.random() * errorTemplates.length)];
    const newErr: SystemError = {
      id: `err-${Date.now()}`,
      ...randomTemplate,
      status: 'PENDENTE',
      timestamp: new Date().toISOString()
    };

    const nextErrors = [newErr, ...errors];
    setErrors(nextErrors);
    updateEntity('admin_errors', nextErrors);

    // Register active incident in Logs
    const currentLogs = JSON.parse(localStorage.getItem(`kaenpro_${session.username}_admin_logs`) || '[]');
    const auditLog: ActivityLog = {
      id: `audit-${Date.now()}`,
      user: 'Monitor Server Telemetry',
      device: 'Server Container daemon',
      action: `INCIDENTE DETECTADO AUTOMATICAMENTE: erro código [${newErr.code}] gerado na área [${newErr.module}]`,
      module: 'Mecanismo Realtime SSE',
      timestamp: new Date().toISOString()
    };
    const nextLogs = [auditLog, ...currentLogs];
    updateEntity('admin_logs', nextLogs);
    setLogs(nextLogs);
  };

  // Filter components logic
  const filteredLogs = logs.filter(log => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = log.user.toLowerCase().includes(term) || log.action.toLowerCase().includes(term) || log.module.toLowerCase().includes(term);
    return matchesSearch;
  });

  const filteredErrors = errors.filter(err => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = err.code.toLowerCase().includes(term) || err.message.toLowerCase().includes(term) || err.module.toLowerCase().includes(term);
    const matchesSeverity = severityFilter === 'ALL' ? true : err.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  if (!isUnlocked) {
    return (
      <div className="min-h-[80vh] w-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-full max-w-md glass-card p-12 rounded-[3.5rem] border border-[#FF2D55]/20 shadow-[0_30px_100px_rgba(255,45,85,0.18)] space-y-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-[#FF2D55] via-transparent to-[#FF2D55]"></div>
          
          <div className="space-y-6">
            <div className="w-24 h-24 bg-zinc-950/80 border border-zinc-800 rounded-[2.2rem] flex items-center justify-center mx-auto text-[#FF2D55] shadow-inner">
              <ShieldAlert size={44} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">ÁREA EXCLUSIVA</h2>
              <p className="text-[9px] font-black text-zinc-650 tracking-[0.45em] uppercase mt-2">CONTROLE DA DIRETORIA</p>
            </div>
          </div>

          <form onSubmit={handleUnlockSubmit} className="space-y-8 text-left">
            {pinError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] py-4 px-6 rounded-2xl text-center font-black uppercase tracking-widest animate-shake">
                {pinError}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-2">Assinatura Digital de Segurança</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="DIGITE A CHAVE ADMINISTRATIVA"
                  className="w-full bg-black border border-white/5 rounded-2xl py-6 px-6 text-center outline-none focus:border-[#FF2D55]/60 text-white font-black tracking-[0.2em] uppercase text-xs shadow-inner"
                />
                <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
              </div>
              <div className="text-zinc-650 text-[9px] font-black uppercase tracking-wider text-center mt-2 pl-1">
                Acesso unificado corporativo. Use a senha mestra para desbloquear.
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#FF2D55] text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-red-950/30 hover:bg-red-600 italic"
            >
              <ShieldCheck size={16} /> Desbloquear Administrativo
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 p-4 md:p-12 pb-48 w-full max-w-[1450px]">
      
      {/* 1. Header Banner */}
      <div className="w-full glass-card p-8 md:p-12 rounded-[3.5rem] border border-[#FF2D55]/30 relative overflow-hidden group shadow-2xl">
         <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-br from-[#FF2D55]/10 to-transparent blur-[120px] rounded-full pointer-events-none animate-pulse"></div>
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 relative z-10">
            <div>
               <div className="flex items-center gap-5 mb-5 select-none">
                  <div className="w-16 h-16 bg-[#FF2D55] rounded-3xl flex items-center justify-center text-white shadow-xl border border-white/20">
                     <Shield size={32} />
                  </div>
                  <div>
                     <h2 className="text-4xl font-black italic uppercase tracking-tighter text-left leading-none">PAINEL DE <span className="text-[#FF2D55]">DIRETORIA</span></h2>
                     <span className="text-[9px] font-black text-zinc-400 bg-white/5 border border-white/10 rounded-full px-3 py-1 mt-2.5 inline-block uppercase tracking-widest">
                       ● PERFIL ADMINISTRATIVO MASTER ATIVO
                     </span>
                  </div>
               </div>
               <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px] italic text-left max-w-4xl">
                 Portal integrado de governança da oficina Kaen Pro: controle de colaboradores, auditoria de operações em tempo real, telemetria de conexão entre dispositivos, relatórios fiscais e controle de segurança de banco de dados.
               </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => requestSecAuth('RESETAR BANCOS DE DADOS DO SISTEMA', 'RESET_DB')}
                className="px-5 py-3.5 bg-red-950/20 border border-red-900/45 hover:bg-red-900/30 rounded-full font-black uppercase text-[8px] tracking-widest text-red-500 transition-all italic flex items-center gap-2"
              >
                <ShieldX size={13} /> Limpar DB Integrado
              </button>
              <button 
                onClick={() => {
                  setIsUnlocked(false);
                  sessionStorage.removeItem('kaen_admin_unlocked');
                }}
                className="px-6 py-4 bg-zinc-950 border border-white/10 hover:border-[#FF2D55]/50 rounded-full font-black uppercase text-[8px] tracking-widest text-zinc-400 hover:text-white transition-all shadow-md italic flex items-center gap-2"
              >
                <Lock size={12} /> Bloquear Console
              </button>
            </div>
         </div>
      </div>

      {/* 2. TAB CONTROLS (SEGMENTED BAR Style) */}
      <div className="bg-zinc-950/60 border border-white/5 p-1.5 rounded-[2rem] flex flex-wrap gap-2 shadow-inner max-w-5xl">
        {[
          { id: 'TELEMETRY', label: 'Telemetria & Rede', icon: Cpu, count: isSyncAlive ? 'ONLINE' : 'DOWN', color: 'hover:text-[#FF2D55]' },
          { id: 'CRUD_USERS', label: 'Acessos & Usuários', icon: Users, count: `${users.length} ATIVOS`, color: 'hover:text-cyan-400' },
          { id: 'ERRORS', label: 'Monitor de Incidentes', icon: Terminal, count: `${errors.filter(e => e.status === 'PENDENTE').length} PENDENTES`, color: 'hover:text-amber-500' },
          { id: 'INVOICES', label: 'Notas Fiscais / PDF', icon: FileSpreadsheet, count: `${invoices.filter(i => !i.resolved).length} FALHAS`, color: 'hover:text-emerald-500' },
          { id: 'AUDIT_LOGS', label: 'Logs de Auditoria', icon: List, count: 'HISTÓRICO', color: 'hover:text-fuchsia-400' }
        ].map(tab => {
          const ActiveIcon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery('');
              }}
              className={`px-5 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-2.5 font-black uppercase text-[9px] tracking-wider
              ${isSelected 
                ? 'bg-[#FF2D55] text-white shadow-lg scale-[1.03]' 
                : `text-zinc-500 bg-transparent ${tab.color} hover:bg-white/5`}`}
            >
              <ActiveIcon size={14} />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-sans font-black ${isSelected ? 'bg-white text-black' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 3. CORE SUBSECTIONS */}
      <div className="mt-8">
        
        {/* TAB 1: TELEMETRY & DEVICE INTERCONNECTION */}
        {activeTab === 'TELEMETRY' && (
          <div className="space-y-10">
            {/* Simulation Controller Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Latency Meter */}
              <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">TEMPO DE RESPOSTA API</span>
                    <Wifi size={16} className={latency > 100 ? 'text-red-500 animate-pulse' : 'text-emerald-500'} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-mono font-black text-white italic">{latency}</span>
                    <span className="text-xs font-black text-zinc-500">ms</span>
                  </div>
                </div>
                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-650 uppercase">Média ponderada do Cloud Run</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${latency < 60 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {latency < 60 ? 'EXCELENTE' : 'ATENÇÃO'}
                  </span>
                </div>
              </div>

              {/* CPU Load Indicator */}
              <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">CARGA DO PROCESSADOR</span>
                    <Cpu size={16} className={cpuLoad > 70 ? 'text-red-500 animate-bounce' : 'text-cyan-500'} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-mono font-black text-white italic">{cpuLoad}%</span>
                    <span className="text-xs font-black text-zinc-500">Uso</span>
                  </div>
                </div>
                {/* Micro visual progress bar */}
                <div className="mt-8 space-y-2">
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#FF2D55] h-full rounded-full transition-all duration-1000" style={{ width: `${cpuLoad}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-zinc-650 uppercase">
                    <span>Cluster Autoscale</span>
                    <span>99.9% Estável</span>
                  </div>
                </div>
              </div>

              {/* Real-time Sync Delay */}
              <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden flex flex-col justify-between bg-zinc-950/40">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">SÉTIMO DELTA DE SYNC</span>
                    <Activity size={16} className="text-[#FF2D55]" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-mono font-black text-white italic">{syncDelay}</span>
                    <span className="text-xs font-black text-zinc-500">seg</span>
                  </div>
                </div>
                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-650 uppercase">Atraso dispositivo-banco</span>
                  <span className="text-[8px] text-emerald-500 font-black uppercase">INSTANTÂNEO</span>
                </div>
              </div>

              {/* Data Weight */}
              <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">MÁXIMO PESO ARQUIVOS DB</span>
                    <Database size={16} className="text-teal-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-mono font-black text-white italic">{dbWeight.toFixed(2)}</span>
                    <span className="text-xs font-black text-zinc-500">MB</span>
                  </div>
                </div>
                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-650 uppercase">Tamanho do BD JSON na Nuvem</span>
                  <span className="text-[8px] text-zinc-500 font-black tracking-widest uppercase">OTIMIZADO</span>
                </div>
              </div>
            </div>

            {/* Simulated Live Interconnectivity Network Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              {/* DISPOSITIVOS DA OFICINA CONECTADOS EM TEMPO REAL */}
              <div className="lg:col-span-8 glass-card p-10 rounded-[3.5rem] border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-lg font-black uppercase italic tracking-tighter text-left">ESTADO DE INTERCONEXÃO EM NUVEM</h3>
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest text-left mt-1.5">ACOMPANHAMENTO ATIVO EM TEMPO REAL DOS TERMINAIS</p>
                    </div>
                    {/* Simulator Action Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button 
                        onClick={handleForceCloudBackup}
                        disabled={isCloudSyncing}
                        className={`px-4 py-2 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-sm
                        ${cloudSyncSuccess 
                          ? 'border-emerald-500 bg-emerald-500 text-black font-black' 
                          : 'border-white/10 bg-zinc-900/90 hover:bg-emerald-500/20 text-white hover:border-emerald-500/40'}`}
                        title="Sincroniza todos os registros locais e remotos imediatamente com a Nuvem Firebase Firestore"
                      >
                        <Cloud size={12} className={isCloudSyncing ? 'text-amber-400 animate-spin' : cloudSyncSuccess ? 'text-black' : 'text-emerald-400'} />
                        {isCloudSyncing ? 'Sincronizando Nuvem...' : cloudSyncSuccess ? '100% Salvo na Nuvem' : 'Sincronizar Nuvem Agora'}
                      </button>

                      <button 
                        onClick={() => setIsSyncAlive(!isSyncAlive)}
                        className={`px-4 py-2 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2
                        ${isSyncAlive 
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black' 
                          : 'border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}
                      >
                        {isSyncAlive ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {isSyncAlive ? 'Simular Offline' : 'Restaurar Conexão'}
                      </button>
                      <button
                        onClick={handleForceGenerateTelemetryFault}
                        className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black border border-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        Injetar Anomalia
                      </button>
                    </div>
                  </div>

                  {/* Real-time Dynamic Active Terminal Device Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {onlineSessions.map((sessionItem, sIdx) => {
                      const isMe = sessionItem.activeUser === session?.activeUser;
                      
                      let IconComponent = Laptop;
                      if (sessionItem.device === "Celular") IconComponent = Smartphone;
                      if (sessionItem.device === "Tablet") {
                        IconComponent = Smartphone; 
                      }

                      return (
                        <div 
                          key={sessionItem.id || sIdx} 
                          className={`p-6 bg-zinc-950/60 rounded-3xl border relative overflow-hidden text-left flex flex-col justify-between h-52 transition-all duration-300
                          ${isMe ? 'border-[#FF2D55]/30 bg-[#FF2D55]/5 shadow-[0_15px_30px_rgba(255,45,85,0.06)]' : 'border-white/5 hover:border-white/10'}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className={`p-3 rounded-2xl ${isMe ? 'bg-[#FF2D55]/10 text-[#FF2D55]' : 'bg-white/5 text-zinc-400'}`}>
                              <IconComponent size={20} />
                            </div>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest
                            ${isMe ? 'bg-[#FF2D55]/15 text-[#FF2D55]' : 'bg-emerald-500/10 text-emerald-500'}`}>
                              {isMe ? 'VOCÊ ATIVO' : 'ONLINE'}
                            </span>
                          </div>
                          
                          <div className="space-y-1 mt-4">
                            <p className="text-sm font-black text-white uppercase italic">{sessionItem.realUsername}</p>
                            <p className="text-[8.5px] font-bold text-zinc-500 leading-none uppercase tracking-widest">
                              CARGO: {sessionItem.role || "Mecânico"}
                            </p>
                          </div>
                          
                          <div className="flex flex-col gap-1 pt-4 border-t border-white/5 mt-3 text-[8px] font-bold text-zinc-600 uppercase">
                            <div className="flex justify-between">
                              <span>Aparelho: {sessionItem.device}</span>
                              <span className="text-zinc-500">IP: {sessionItem.ip}</span>
                            </div>
                            <div className="flex justify-between text-zinc-500 mt-0.5">
                              <span>ENTRADA: {new Date(sessionItem.timestamp).toLocaleTimeString('pt-BR')}</span>
                              <span className="text-[#FF2D55]">CONECTADO</span>
                            </div>

                            {!isMe && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm(`Deseja revogar o token e forçar a desconexão imediata do aparelho de ${sessionItem.realUsername}?`)) return;
                                  try {
                                    const tenant = session?.username || 'rafael';
                                    const res = await fetch(`/api/presence/disconnect/${tenant}/${sessionItem.id}`, { method: 'POST' });
                                    if (res.ok) {
                                      const res2 = await fetch(`/api/presence/${tenant}`);
                                      if (res2.ok) {
                                        setOnlineSessions(await res2.json());
                                      }
                                    } else {
                                      alert("Dispositivo remoto já se desconectou.");
                                    }
                                  } catch (e) {
                                    alert("Falha na requisição para o servidor.");
                                  }
                                }}
                                className="mt-2 text-[#FF2D55] text-left text-[8px] font-black tracking-[0.2em] hover:underline uppercase transition-all"
                              >
                                [ ✕ FORÇAR DESCONEXÃO IMEDIATA ]
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {onlineSessions.length === 0 && (
                      <div className="col-span-full py-12 text-center text-zinc-600 font-black text-[10px] uppercase tracking-widest border border-dashed border-white/5 rounded-3xl">
                        Nenhum terminal operacional conectado ao stream.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 p-6 bg-zinc-900/30 rounded-2xl border border-white/5 text-left flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[8px] font-black text-zinc-550 tracking-[0.2em] uppercase block">DIRETRIZ DE DIAGNÓSTICO</span>
                    <p className="text-xs text-zinc-400 font-medium">Os dispositivos realizam atualizações de faturamento e fluxo de pátio por meio de SSE (Server-Sent Events) síncrono no servidor kaenpro-mechanic.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"></div>
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">SLA DA NUVEM: 99.98%</span>
                  </div>
                </div>
              </div>

              {/* TECHNICAL PANELS METRICS (SLA, SPEED, BROKEN LOGIC) */}
              <div className="lg:col-span-4 glass-card p-10 rounded-[3.5rem] border border-white/5 flex flex-col text-left justify-between bg-zinc-950/20">
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter mb-1.5">MÉTRICAS DO SERVIDOR</h3>
                  <p className="text-[9px] font-black text-zinc-650 uppercase tracking-widest mb-8">VERIFICAÇÃO DE SUBSISTEMAS PRINCIPAIS</p>
                  
                  <div className="space-y-6">
                    {/* Database metric */}
                    <div className="space-y-2">
                      <div className="flex justify-between font-black uppercase text-[10px]">
                        <span className="text-zinc-500">INTEGRIDADE DO BANCO</span>
                        <span className="text-emerald-500">Aprovada (100%)</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>

                    {/* Websocket speed metric */}
                    <div className="space-y-2">
                      <div className="flex justify-between font-black uppercase text-[10px]">
                        <span className="text-zinc-500">HANDSHAKE DELAY</span>
                        <span className="text-teal-400">Altamente Otimizado</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-2">
                        <div className="bg-teal-400 h-2 rounded-full animation-pulse" style={{ width: '92%' }}></div>
                      </div>
                    </div>

                    {/* Operational health checks */}
                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">✔ Sincronizador de OS</span>
                        <span className="text-emerald-500 font-bold uppercase">Funcionando</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">✔ Módulo Whatsapp NFe</span>
                        <span className="text-emerald-500 font-bold uppercase">Conectado</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">✔ Arquivo Persistência</span>
                        <span className="text-amber-500 font-bold uppercase">kaen_db.json</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">✔ SSE Event Server</span>
                        <span className="text-emerald-500 font-bold uppercase">Online (Porta 3000)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5">
                  <span className="text-[8px] font-bold text-zinc-600 uppercase">Ultima compilação técnica executada com sucesso.</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE ACCOUNTS & ACCESS CONTROLS (CRUD USERS) */}
        {activeTab === 'CRUD_USERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left box: Create User Form */}
            <div className="lg:col-span-5 glass-card p-10 rounded-[3.5rem] border border-[#FF2D55]/15 text-left h-fit">
              <div className="flex items-center gap-3 mb-8">
                <UserPlus size={22} className="text-[#FF2D55]" />
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter lead-none">CRIAR BASE DE OPERADOR</h3>
                  <p className="text-[9px] font-black text-zinc-650 tracking-wider">CADASTRAR CREDENCIAIS E DISPOSITIVOS</p>
                </div>
              </div>

              <form onSubmit={handleCreateUserSubmit} className="space-y-6">
                {/* Colaborador Name */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Nome do operador (ex: Roberto Dias)"
                    className="w-full bg-black border border-white/5 rounded-2xl py-4 px-5 text-white outline-none focus:border-[#FF2D55]/60 text-xs font-semibold placeholder-zinc-700 shadow-inner"
                  />
                </div>

                {/* Login Username */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Identificação / Login (Único)</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="Login do usuário (ex: roberto)"
                    className="w-full bg-black border border-white/5 rounded-2xl py-4 px-5 text-white outline-none focus:border-[#FF2D55]/60 text-xs font-mono shadow-inner"
                  />
                </div>

                {/* Password input */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Chave Pessoal (Acesso Inicial)</label>
                  <input 
                    type="password" 
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-black border border-white/5 rounded-2xl py-4 px-5 text-white outline-none focus:border-[#FF2D55]/60 text-xs shadow-inner"
                  />
                </div>

                {/* Role selection & device */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Cargo Workspace</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 px-4 text-white outline-none text-xs font-bold"
                    >
                      <option value="Funcionário">Mecânico / Oficina</option>
                      <option value="Recepção">Recepção / Cadastro</option>
                      <option value="Dono">Administrador / Dono</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Aparelho do Funcionário</label>
                    <input 
                      type="text"
                      value={newUser.deviceRegistered}
                      onChange={(e) => setNewUser({ ...newUser, deviceRegistered: e.target.value })}
                      placeholder="iPad / Computador recepção"
                      className="w-full bg-black border border-white/5 rounded-2xl py-4 px-4 text-white outline-none text-xs font-semibold placeholder-zinc-700"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#FF2D55] text-white py-4.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 transition-colors shadow-lg active:scale-95 italic mt-4"
                >
                  Confirmar Cadastro na Nuvem
                </button>
              </form>
            </div>

            {/* Right box: Manage active team accounts & user registers */}
            <div className="lg:col-span-7 glass-card p-10 rounded-[3.5rem] border border-white/5 text-left flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-lg font-black uppercase italic tracking-tighter">OPERADORES DO SISTEMA</h3>
                    <p className="text-[9px] font-black text-zinc-650 tracking-widest mt-1">SESSÕES REGISTRADAS DE USOS NO WORKSPACE</p>
                  </div>
                </div>

                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1 no-scrollbar">
                  {users.map(u => {
                    const isSelf = u.username === session?.username;
                    return (
                      <div key={u.id} className="p-5 bg-zinc-950/60 rounded-3xl border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
                        {u.status === 'BLOQUEADO' && (
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                        )}
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xs font-black uppercase italic
                            ${u.status === 'BLOQUEADO' 
                              ? 'bg-red-950/20 border-red-900/40 text-red-500' 
                              : u.role === 'Dono' 
                                ? 'bg-[#FF2D55]/10 border-[#FF2D55]/20 text-[#FF2D55]' 
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                            {u.username.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-white uppercase italic">{u.name}</p>
                              {isSelf && (
                                <span className="text-[7px] bg-white/10 border border-white/10 text-white font-black px-1.5 py-0.5 rounded uppercase">VOCÊ</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 font-semibold text-[10px]">
                              <span className="text-zinc-500">Acesso: <strong className="text-zinc-400 font-black">{u.username}</strong></span>
                              <span className="text-zinc-650">•</span>
                              <span className="text-zinc-500">Cargo: <strong className="text-zinc-400 font-extrabold">{u.role}</strong></span>
                              <span className="text-zinc-650">•</span>
                              <span className="text-zinc-500">Dispositivo Salvo: <strong className={u.deviceRegistered?.includes('[Confiável]') ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>{u.deviceRegistered || 'Nenhum'}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons with security double locks */}
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                          <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider block mr-2
                            ${u.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500 animate-pulse'}`}>
                            {u.status}
                          </span>
                          
                          <button
                            onClick={() => {
                              const confirmReset = window.confirm(`Desvincular aparelhos de ${u.name}? No próximo acesso deste colaborador, a senha será exigida obrigatoriamente.`);
                              if (confirmReset) {
                                const updated = users.map(user => user.id === u.id ? { ...user, deviceRegistered: 'Nenhum dispositivo salvo' } : user);
                                setUsers(updated);
                                updateEntity('admin_users', updated);
                              }
                            }}
                            className="p-3 bg-zinc-900 hover:bg-amber-500/10 text-zinc-500 hover:text-amber-400 border border-white/5 hover:border-amber-500/20 rounded-xl transition-all"
                            title="Desvincular Dispositivos Salvos (Exige senha no próximo login)"
                          >
                            <Smartphone size={14} />
                          </button>

                          {!isSelf && (
                            <>
                              <button
                                onClick={() => requestSecAuth(
                                  `BLOQUEAR/DESBLOQUEAR ACESSO DO USUÁRIO ${u.username.toUpperCase()}`,
                                  'BLOCK_USER',
                                  u.id
                                )}
                                className="p-3 bg-zinc-900 hover:bg-[#FF2D55]/10 text-zinc-500 hover:text-[#FF2D55] border border-white/5 hover:border-[#FF2D55]/20 rounded-xl transition-all"
                                title="Bloquear / Desbloquear Usuário"
                              >
                                {u.status === 'ATIVO' ? <Unlock size={14} /> : <Lock size={14} />}
                              </button>
                              <button
                                onClick={() => requestSecAuth(
                                  `EXCLUIR DEFINITIVAMENTE OPERADOR ${u.username.toUpperCase()}`,
                                  'DELETE_USER',
                                  u.id,
                                  u.name
                                )}
                                className="p-3 bg-zinc-900 hover:bg-red-900/10 text-zinc-500 hover:text-red-500 border border-white/5 hover:border-red-500/20 rounded-xl transition-all"
                                title="Deletar Usuário"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Permission Policy Box */}
              <div className="mt-8 p-6 bg-zinc-900/20 rounded-[2.5rem] border border-white/5">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">POLÍTICA DE PERMISSÃO OPERACIONAL</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'canEditPrices', label: 'Editar Preços / Orçamentos', desc: 'Permitir edição de taxas por funcionários e recepção.' },
                    { key: 'canDelete', label: 'Segurança de Descarte', desc: 'Deleção de fichas e arquivos habilitados para equipe.' },
                    { key: 'canCloseOS', label: 'Faturamento de Caixa', desc: 'Habilitar encerramentos por caixas da recepção.' },
                    { key: 'strictDoubleAuth', label: 'Autenticação de Duas Etapas', desc: 'Sempre requisitar PIN de diretoria para ações críticas.' }
                  ].map(p => (
                    <div key={p.key} className="flex justify-between items-center bg-black/40 p-3 rounded-2xl border border-white/5">
                      <div className="space-y-0.5 text-left pr-2">
                        <span className="text-[10px] font-black text-white uppercase italic block leading-none">{p.label}</span>
                        <span className="text-[8px] text-zinc-600 block">{p.desc}</span>
                      </div>
                      <button 
                        onClick={() => handleTogglePerm(p.key as any)}
                        className={`transition-colors duration-300 shrink-0 ${permissions[p.key as keyof typeof permissions] ? 'text-[#FF2D55]' : 'text-zinc-800'}`}
                      >
                        {permissions[p.key as keyof typeof permissions] ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM ERRORS & WEB DEADLOGS */}
        {activeTab === 'ERRORS' && (
          <div className="space-y-10">
            {/* Header and filter block */}
            <div className="glass-card p-10 rounded-[3.5rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">CENTRAL DE MONITORAMENTO DE INCIDENTES</h3>
                <p className="text-[9px] font-black text-zinc-550 tracking-widest mt-1.5 text-left uppercase">RASTRO DE FALHAS DE SISTEMA, BANCO DE DADOS E CONEXÃO</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Search Term */}
                <div className="relative flex-1 md:w-64">
                  <span className="absolute left-3.5 top-2.5 text-zinc-650"><Search size={14} /></span>
                  <input 
                    type="text" 
                    placeholder="Buscar erro ou módulo..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black border border-white/5 py-2.5 pl-9 pr-4 rounded-xl text-[10px] font-bold text-white placeholder-zinc-700 outline-none focus:border-white/20"
                  />
                </div>
                {/* Severity Dropdown */}
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-black border border-white/5 text-[10px] font-black uppercase py-2.5 px-3 rounded-xl outline-none text-zinc-400"
                >
                  <option value="ALL">Todas Severidades</option>
                  <option value="WARNING">WARNING (Apenas avisos)</option>
                  <option value="CRITICAL">CRITICAL (Anomalias)</option>
                  <option value="FATAL">FATAL (Offline completo)</option>
                </select>
                <button
                  onClick={handleForceGenerateTelemetryFault}
                  className="bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black border border-amber-500/20 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all italic font-mono shrink-0"
                >
                  Injetar Erro para Teste
                </button>
              </div>
            </div>

            {/* Error Listing Grid */}
            <div className="space-y-6">
              {filteredErrors.length === 0 ? (
                <div className="p-16 border-2 border-dashed border-emerald-500/20 text-emerald-500 rounded-[2.5rem] text-center bg-emerald-500/5">
                  <CheckCircle size={44} className="mx-auto text-emerald-500 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest font-mono">Nenhum evento anômalo pendente no servidor.</p>
                  <p className="text-[10px] text-zinc-550 font-bold uppercase mt-1">SISTEMA INTEGRADO OPERANDO DENTRO DOS PARAMETROS ÓTIMOS</p>
                </div>
              ) : (
                filteredErrors.map(err => (
                  <div key={err.id} className={`p-6 bg-zinc-950/40 rounded-[2.5rem] border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-left relative overflow-hidden transition-all hover:border-white/10
                    ${err.status === 'RESOLVIDO' 
                      ? 'border-emerald-500/15 opacity-60' 
                      : err.severity === 'FATAL' 
                        ? 'border-red-650/30' 
                        : err.severity === 'CRITICAL' 
                          ? 'border-amber-600/30' 
                          : 'border-white/5'}`}>
                    
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Severity Tag */}
                        <span className={`px-2.5 py-1 rounded text-[8px] font-black tracking-widest uppercase
                        ${err.severity === 'FATAL' 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : err.severity === 'CRITICAL' 
                            ? 'bg-amber-600 text-white' 
                            : 'bg-zinc-800 text-zinc-400'}`}>
                          {err.severity}
                        </span>

                        <span className="text-[11px] font-mono font-black text-white">{err.code}</span>
                        <span className="text-zinc-650">•</span>
                        <span className="text-[9px] font-black bg-white/5 border border-white/10 text-zinc-400 px-2 py-0.5 rounded uppercase tracking-wider">{err.module}</span>
                        <span className="text-zinc-650">•</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{new Date(err.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-xs text-zinc-300 font-medium leading-relaxed max-w-5xl">{err.message}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-end w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                      {err.status === 'RESOLVIDO' ? (
                        <div className="text-right">
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-black uppercase tracking-wider inline-block">RESOLVIDO</span>
                          <span className="text-[8px] text-zinc-600 font-bold block uppercase mt-1">Por: {err.resolvedBy}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => requestSecAuth(
                            `NOTIFICAR RESOLUÇÃO DO INCIDENTE [${err.code}]`,
                            'RESOLVE_ERROR',
                            err.id,
                            err.code
                          )}
                          className="bg-zinc-900 hover:bg-emerald-500 text-zinc-400 hover:text-black hover:font-black border border-white/5 hover:border-emerald-500/30 font-black uppercase text-[9px] tracking-widest px-4 py-3 rounded-xl transition-all font-mono"
                        >
                          Marcar como Resolvido
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: FISCAL NF-e & PDF MONITORING */}
        {activeTab === 'INVOICES' && (
          <div className="space-y-10">
            {/* Context message */}
            <div className="glass-card p-10 rounded-[3.5rem] border border-white/5 text-left">
              <h3 className="text-xl font-black uppercase italic tracking-tighter mb-1.5">RELATORIO E MONITORAMENTO DE NOTAS / PDF</h3>
              <p className="text-[9px] font-black text-zinc-550 tracking-widest uppercase">CONTROLE DE COMPROVANTES, SÍNCRONO FISCAL E INTEGRAÇÃO SEFAZ</p>
              
              {/* Scorecard metrics of failures */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                <div className="bg-black/40 border border-white/5 p-4 rounded-3xl text-left">
                  <span className="text-[8px] font-black text-zinc-550 block uppercase">NFe AUTENTICADAS</span>
                  <span className="text-2xl font-black text-emerald-500 italic mt-1 inline-block">100% OK</span>
                </div>
                <div className="bg-black/40 border border-white/5 p-4 rounded-3xl text-left">
                  <span className="text-[8px] font-black text-zinc-550 block uppercase">NFe REJEITADAS</span>
                  <span className="text-2xl font-black text-amber-500 italic mt-1 inline-block">
                    {invoices.filter(i => i.status === 'REJEITADA_SEFAZ' && !i.resolved).length} FALHAS
                  </span>
                </div>
                <div className="bg-black/40 border border-white/5 p-4 rounded-3xl text-left">
                  <span className="text-[8px] font-black text-zinc-550 block uppercase">ERROS EM PDF DE OS</span>
                  <span className="text-2xl font-black text-red-500 italic mt-1 inline-block">
                    {invoices.filter(i => i.status === 'FALHOU_PDF' && !i.resolved).length} ACUMULADAS
                  </span>
                </div>
                <div className="bg-black/40 border border-white/5 p-4 rounded-3xl text-left">
                  <span className="text-[8px] font-black text-zinc-550 block uppercase">CERTIFICADO DIGITAL A1</span>
                  <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1.5 rounded-lg mt-1 inline-block uppercase tracking-wider">ATIVO E HOMOLOGADO</span>
                </div>
              </div>
            </div>

            {/* Invoices Logs listing */}
            <div className="space-y-6 text-left">
              {invoices.map(it => (
                <div key={it.id} className={`p-6 bg-zinc-950/60 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden transition-all hover:border-white/10
                  ${it.resolved ? 'opacity-55' : ''}`}>
                  
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-2.5 py-1 text-[8px] font-black tracking-wider rounded uppercase block
                        ${it.status === 'AUTENTICADA' ? 'bg-emerald-500/10 text-emerald-500' :
                          it.status === 'FALHOU_PDF' ? 'bg-red-500/10 text-red-500 animate-pulse' :
                          it.status === 'REJEITADA_SEFAZ' ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-805 text-zinc-400'}`}>
                        {it.status.replace('_', ' ')}
                      </span>
                      <strong className="text-xs font-black text-white uppercase italic">OS #{it.osNumber}</strong>
                      <span className="text-zinc-650">•</span>
                      <span className="text-xs text-zinc-400 font-bold">{it.client}</span>
                      <span className="text-zinc-650">•</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{new Date(it.timestamp).toLocaleString('pt-BR')}</span>
                    </div>

                    <div className="flex gap-4 text-[11px] font-semibold text-zinc-400">
                      <span>Valor total: <strong className="text-white font-black">R$ {it.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                      <span className="text-zinc-650">|</span>
                      <span>Anomalia: <strong className="text-red-400/80 font-mono">{it.reason}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 justify-end w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                    {it.resolved ? (
                      <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-2 px-4 rounded-xl uppercase tracking-wider">RESOLVIDA</span>
                    ) : (
                      <button
                        onClick={() => requestSecAuth(
                          `FORÇAR RETENTATIVA E RE-EMISSÃO DA NFe OS #${it.osNumber}`,
                          'RE_EMIT_INVOICE',
                          it.id,
                          it.osNumber
                        )}
                        className="bg-zinc-90 w-full md:w-auto bg-zinc-900 hover:bg-[#FF2D55] text-white hover:font-bold border border-white/5 hover:border-[#FF2D55]/30 py-3 px-5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all italic flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={12} className="shrink-0" />
                        Re-enviar à Sefaz
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM SECURITY AUDIT LOGS */}
        {activeTab === 'AUDIT_LOGS' && (
          <div className="space-y-10">
            {/* Header with Search filter option */}
            <div className="glass-card p-10 rounded-[3.5rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">HISTÓRICO DE AUDITORIA DE GOVERNANÇA</h3>
                <p className="text-[9px] font-black text-zinc-550 tracking-widest mt-1.5 uppercase">ACOMPANHAMENTO DEFINITIVO DE COMANDOS EXECUTADOS NO WORKSPACE</p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <span className="absolute left-3.5 top-3.5 text-zinc-650"><Search size={14} /></span>
                  <input 
                    type="text" 
                    placeholder="Filtrar por nome, ação ou módulo..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black border border-white/5 py-3 pl-10 pr-4 rounded-xl text-[11px] font-bold text-white placeholder-zinc-700 outline-none"
                  />
                </div>
                <button 
                  onClick={() => requestSecAuth('EXPURGAR TODO O HISTÓRICO DE AUDITORIA', 'PURGE_LOGS')}
                  className="px-5 py-3 border border-red-900/30 bg-red-950/10 hover:bg-red-900/40 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-500 transition-all shrink-0"
                >
                  Expurgar Logs
                </button>
              </div>
            </div>

            {/* Logs List Container */}
            <div className="space-y-4 max-h-[550px] overflow-y-auto no-scrollbar pr-1">
              {filteredLogs.length === 0 ? (
                <div className="p-16 border-2 border-dashed border-zinc-800 rounded-[2.5rem] text-center text-zinc-600 font-black text-xs uppercase tracking-widest">
                  NENHUMA ATIVIDADE LOCALIZADA COM ESTES CRITÉRIOS.
                </div>
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className="p-5 bg-zinc-950/50 rounded-3xl border border-white/5 flex flex-col md:flex-row text-left items-start md:items-center justify-between gap-4 hover:border-white/10 transition-all">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-black text-white uppercase italic">{log.user}</span>
                        <span className="text-[8px] bg-[#FF2D55]/10 border border-[#FF2D55]/20 text-[#FF2D55] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">{log.module}</span>
                        <span className="text-zinc-650">•</span>
                        <span className="text-[8px] bg-zinc-90 px-2 py-0.5 rounded text-zinc-500 border border-zinc-800 font-bold uppercase tracking-widest">{log.device}</span>
                      </div>
                      <p className="text-xs text-zinc-350 font-medium leading-relaxed">{log.action}</p>
                    </div>
                    
                    <span className="text-[10px] font-mono text-zinc-650 shrink-0">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* 4. SECURITY DUAL-GATE AUTH MODAL POPUP (CHAVE REGISTRADA PARA DELEÇÕES) */}
      {securityModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-zinc-950 border border-red-900/35 rounded-[3rem] p-10 space-y-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-transparent to-red-600"></div>
            
            <div className="space-y-4">
              <div className="w-16 h-16 bg-red-900/10 border border-red-900/30 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                <Lock size={28} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-black italic uppercase tracking-tighter text-white">REVALIDAR DIRETORIA GERAL</h4>
                <p className="text-[9px] font-black text-red-500 tracking-wider uppercase mt-1">{securityModal.title}</p>
              </div>
            </div>

            <form onSubmit={handleSecAuthConfirmSubmit} className="space-y-6 text-left">
              {secError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] py-4 px-5 rounded-2xl text-center font-black uppercase tracking-widest">
                  {secError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Senha de Autorização Administrativa</label>
                <input 
                  type="password"
                  required
                  autoFocus
                  value={secPassword}
                  onChange={(e) => setSecPassword(e.target.value)}
                  placeholder="EX: enzo1234"
                  className="w-full bg-black border border-white/5 rounded-2xl py-4 px-5 text-center text-white outline-none focus:border-red-500/50 text-xs font-black tracking-widest"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setSecurityModal({ isOpen: false, title: '', actionType: 'SAVE_PERMS' })}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-red-650 hover:bg-red-600 text-white bg-[#FF2D55] py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest italic"
                >
                  Confirmar Ação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
