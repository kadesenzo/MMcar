import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './views/LandingPage';
import LoginPage from './views/LoginPage';
import Dashboard from './views/Dashboard';
import ServiceOrders from './views/ServiceOrders';
import NewServiceOrder from './views/NewServiceOrder';
import Inventory from './views/Inventory';
import Clients from './views/Clients';
import ClientDetails from './views/ClientDetails';
import Vehicles from './views/Vehicles';
import VehicleDetails from './views/VehicleDetails';
import Employees from './views/Employees';
import Billing from './views/Billing';
import Financial from './views/Financial';
import Calendar from './views/Calendar';
import MechanicTerminal from './views/MechanicTerminal';
import ReceptionTerminal from './views/ReceptionTerminal';
import AdminPanel from './views/AdminPanel';
import AiAssistant from './views/AiAssistant';
import { ProjectDocument } from './views/ProjectDocument';
import Budgets from './views/Budgets';
import ChecklistsView from './views/ChecklistsView';
import Suppliers from './views/Suppliers';
import Reports from './views/Reports';
import Marketing from './views/Marketing';
import Reviews from './views/Reviews';
import AfterSales from './views/AfterSales';
import WhatsAppHub from './views/WhatsAppHub';
import Gallery from './views/Gallery';
import PatioBoard from './views/PatioBoard';
import QualityControl from './views/QualityControl';
import Sidebar from './components/Sidebar';
import Header, { WorkspaceMode } from './components/Header';
import { SyncStatus, UserSession, UserRole } from './types';
import { subscribeToWorkshopCloud, saveWorkshopFieldToCloud, fetchAllWorkshopDataFromCloud } from './src/lib/firebase';
import { isAdminRole, isMechanicRole, isReceptionRole, isStockRole } from './src/utils/workshopHelpers';

// Global Cloud Sync Interceptor variables
let isApplyingRemoteUpdate = false;
const debounceTimers: Record<string, any> = {};

function triggerDebouncedCloudSync(key: string, value: string, tenant: string) {
  if (isApplyingRemoteUpdate) return;
  if (!key.startsWith('kaenpro_') && !key.startsWith('kaen_')) return;

  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }

  debounceTimers[key] = setTimeout(async () => {
    try {
      const parsed = JSON.parse(value);
      const cleanKey = key.replace(/^kaenpro_[^_]+_/, '').replace(/^kaen_/, '');
      const sharedKey = `kaenpro_rafael_${cleanKey}`;

      // 1. Direct Firestore cloud persistence (non-blocking so server sync always runs)
      saveWorkshopFieldToCloud(sharedKey, parsed).catch(() => {});
      if (key !== sharedKey) {
        saveWorkshopFieldToCloud(key, parsed).catch(() => {});
      }

      // 2. Server API sync & real-time broadcast
      await fetch(`/api/sync/${tenant || 'rafael'}/${cleanKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });
    } catch (err) {
      // ignore parse or network error
    }
  }, 350);
}

interface PrivateLayoutProps {
  children: React.ReactNode;
  session: UserSession | null;
  syncStatus: SyncStatus;
  workspaceMode: WorkspaceMode;
  onLogout: (forgetDevice?: boolean) => void;
  onWorkspaceModeChange: (mode: WorkspaceMode) => void;
  syncData: (key: string, data: any) => Promise<void>;
}

const PrivateLayout: React.FC<PrivateLayoutProps> = ({
  children,
  session,
  syncStatus,
  workspaceMode,
  onLogout,
  onWorkspaceModeChange,
  syncData
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);

  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      if (workspaceMode !== 'PRINCIPAL') {
        onWorkspaceModeChange('PRINCIPAL');
      }
    }
  }, [location.pathname, workspaceMode, onWorkspaceModeChange]);

  if (!session) return <Navigate to="/login" replace />;

  const renderActiveContent = () => {
    switch (workspaceMode) {
      case 'MECANICO':
        return <MechanicTerminal session={session} syncData={syncData} />;
      case 'RECEPCAO':
        return <ReceptionTerminal session={session} syncData={syncData} />;
      case 'ESTOQUE':
        return <Inventory session={session} syncData={syncData} />;
      case 'ADMIN':
        return <AdminPanel session={session} syncData={syncData} />;
      case 'PRINCIPAL':
      default:
        return React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, { session, syncData })
          : children;
    }
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      <Sidebar
        role={session.role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={() => onWorkspaceModeChange('PRINCIPAL')}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header
          role={session.role}
          username={session.realUsername}
          syncStatus={syncStatus}
          onLogout={onLogout}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          workspaceMode={workspaceMode}
          onWorkspaceModeChange={onWorkspaceModeChange}
          tenant={session.username}
        />

        <main className="flex-1 overflow-y-auto overflow-x-visible bg-[#050505] scroll-smooth overscroll-contain no-scrollbar flex flex-col items-center">
          <div className="w-full max-w-[1200px] min-h-full flex flex-col items-center overflow-x-visible p-1 md:p-3">
            {renderActiveContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.SYNCED);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('PRINCIPAL');

  // Install automatic cloud sync interceptor on localStorage.setItem
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).__kaen_storage_interceptor_installed) {
      (window as any).__kaen_storage_interceptor_installed = true;
      const originalSetItem = localStorage.setItem.bind(localStorage);
      (window as any).__kaen_original_setItem = originalSetItem;

      localStorage.setItem = function(key: string, value: string) {
        originalSetItem(key, value);
        if (!isApplyingRemoteUpdate) {
          const tenant = sessionStorage.getItem('kaen_session')
            ? (JSON.parse(sessionStorage.getItem('kaen_session') || '{}').username || 'rafael')
            : 'rafael';
          triggerDebouncedCloudSync(key, value, tenant);
        }
      };
    }
  }, []);

  // Load session from sessionStorage OR recognized trusted device
  useEffect(() => {
    const savedSession = sessionStorage.getItem('kaen_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
        return;
      } catch (e) {
        sessionStorage.removeItem('kaen_session');
      }
    }

    // Check if this physical device was previously authorized and remembered
    try {
      const trustedRaw = localStorage.getItem('kaen_trusted_device');
      const deviceToken = localStorage.getItem('kaen_device_token');
      if (trustedRaw && deviceToken) {
        const trusted = JSON.parse(trustedRaw);
        if (trusted && trusted.deviceId === deviceToken && trusted.username && trusted.role) {
          const restoredSession: UserSession = {
            username: trusted.username,
            activeUser: trusted.activeUser || trusted.username,
            realUsername: trusted.realUsername || trusted.activeUser || trusted.username,
            role: trusted.role,
            lastSync: new Date().toISOString()
          };
          setSession(restoredSession);
          sessionStorage.setItem('kaen_session', JSON.stringify(restoredSession));
        }
      }
    } catch (e) {
      console.warn("Could not restore trusted device session", e);
    }
  }, []);

  // Update starting workspace mode when session changes
  useEffect(() => {
    if (session) {
      if (isMechanicRole(session.role)) {
        setWorkspaceMode('MECANICO');
      } else if (isReceptionRole(session.role)) {
        setWorkspaceMode('RECEPCAO');
      } else if (isStockRole(session.role)) {
        setWorkspaceMode('ESTOQUE');
      } else {
        setWorkspaceMode('PRINCIPAL');
      }
    }
  }, [session]);

  // Real-time synchronization stream & Presence awareness
  useEffect(() => {
    if (!session) return;

    const tenant = session.username; // Kept as "rafael" for full backward compatibility with dynamic keys

    // 1. Initial Fetch from Cloud DB & Firestore to LocalStorage
    const fetchInitialData = async () => {
      try {
        setSyncStatus(SyncStatus.SYNCING);

        // Fetch directly from Firebase Firestore first for immediate source-of-truth access
        try {
          const cloudFirestoreData = await fetchAllWorkshopDataFromCloud();
          if (cloudFirestoreData) {
            isApplyingRemoteUpdate = true;
            try {
              for (const [k, v] of Object.entries(cloudFirestoreData)) {
                if (typeof v === 'undefined' || k === 'lastUpdatedAt') continue;
                const cleanKey = k.replace(/^kaenpro_[^_]+_/, '');
                localStorage.setItem(`kaenpro_${tenant}_${cleanKey}`, JSON.stringify(v));
                localStorage.setItem(`kaenpro_rafael_${cleanKey}`, JSON.stringify(v));
              }
            } finally {
              isApplyingRemoteUpdate = false;
            }
            window.dispatchEvent(new CustomEvent('kaen_storage_updated'));
          }
        } catch (fbErr) {
          console.warn("Direct Firestore initial fetch warning:", fbErr);
        }

        // Also fetch from Server API (which syncs SQLite/JSON cache and Firestore)
        const res = await fetch(`/api/sync/${tenant}`);
        if (res.ok) {
          const data = await res.json();
          isApplyingRemoteUpdate = true;
          try {
            for (const [key, value] of Object.entries(data)) {
              localStorage.setItem(`kaenpro_${tenant}_${key}`, JSON.stringify(value));
              localStorage.setItem(`kaenpro_rafael_${key}`, JSON.stringify(value));
            }
          } finally {
            isApplyingRemoteUpdate = false;
          }
          window.dispatchEvent(new CustomEvent('kaen_storage_updated'));
        }
        setSyncStatus(SyncStatus.SYNCED);
      } catch (e) {
        console.error("Failed to connect to cloud database, running in offline/local storage fallback.", e);
        setSyncStatus(SyncStatus.SYNCED);
      }
    };
    fetchInitialData();

    // 2. EventSource Stream
    let eventSource: EventSource | null = null;
    
    const detectDevice = () => {
      const ua = navigator.userAgent;
      if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
      if (/mobile|iphone|ipod|android/i.test(ua)) return "Celular";
      return "Desktop PC";
    };

    const connectStream = () => {
      const activeUser = session.activeUser || tenant;
      const realUsername = session.realUsername || activeUser;
      const role = session.role;
      const device = detectDevice();

      const qs = `activeUser=${encodeURIComponent(activeUser)}&role=${encodeURIComponent(role)}&device=${encodeURIComponent(device)}&realUsername=${encodeURIComponent(realUsername)}`;
      
      eventSource = new EventSource(`/api/sync-stream/${tenant}?${qs}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data && data.type === "presence") {
            window.dispatchEvent(new CustomEvent("kaen_presence_updated", { detail: data.sessions }));
            return;
          }

          if (data && data.type === "force_disconnect") {
            handleLogout();
            alert("SUA CONEXÃO FOI ENCERRADA PELO ADMINISTRADOR DO SISTEMA: DISPOSITIVO REMOVIDO.");
            return;
          }
          
          if (data && data.type === "connected") {
            return;
          }

          // Otherwise, general storage sync update broadcasted
          const { key, value } = data;
          const userKey = `kaenpro_${tenant}_${key}`;
          isApplyingRemoteUpdate = true;
          try {
            localStorage.setItem(userKey, JSON.stringify(value));
            localStorage.setItem(`kaenpro_rafael_${key}`, JSON.stringify(value));
          } finally {
            isApplyingRemoteUpdate = false;
          }
          
          window.dispatchEvent(new CustomEvent('kaen_storage_updated', { detail: { key, value } }));
        } catch (e) {
          console.error("Error processing SSE message", e);
        }
      };
      
      eventSource.onerror = () => {
        eventSource?.close();
        setTimeout(connectStream, 5000);
      };
    };
    
    connectStream();

    // 3. Hybrid Background Poll & Instant Sync on Focus/Visibility
    const runSyncFetch = async () => {
      try {
        const res = await fetch(`/api/sync/${tenant}?_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          let anyChanged = false;
          isApplyingRemoteUpdate = true;
          try {
            for (const [key, value] of Object.entries(data)) {
              const userKey = `kaenpro_${tenant}_${key}`;
              const localRaw = localStorage.getItem(userKey);
              const serverRaw = JSON.stringify(value);
              if (localRaw !== serverRaw) {
                localStorage.setItem(userKey, serverRaw);
                localStorage.setItem(`kaenpro_rafael_${key}`, serverRaw);
                anyChanged = true;
              }
            }
          } finally {
            isApplyingRemoteUpdate = false;
          }
          if (anyChanged) {
            window.dispatchEvent(new CustomEvent('kaen_storage_updated'));
          }
        }
      } catch (err) {
        console.warn("Background db sync poll encountered network latency.", err);
      }

      // Poll presence terminal list
      try {
        const res = await fetch(`/api/presence/${tenant}`);
        if (res.ok) {
          const list = await res.json();
          window.dispatchEvent(new CustomEvent("kaen_presence_updated", { detail: list }));
        }
      } catch (err) {
        console.warn("Background presence update poll encountered network latency.", err);
      }
    };

    const pollInterval = setInterval(runSyncFetch, 2500);

    const handleSyncTrigger = () => {
      if (document.visibilityState === 'visible') {
        runSyncFetch();
      }
    };

    window.addEventListener('focus', handleSyncTrigger);
    document.addEventListener('visibilitychange', handleSyncTrigger);

    // 4. Real-time Firebase Firestore cloud listener
    const unsubscribeCloud = subscribeToWorkshopCloud((cloudData) => {
      let anyChanged = false;
      isApplyingRemoteUpdate = true;
      try {
        for (const [k, v] of Object.entries(cloudData)) {
          if (typeof v === 'undefined' || k === 'lastUpdatedAt') continue;
          const cleanKey = k.replace(/^kaenpro_[^_]+_/, '');
          const targetKey1 = `kaenpro_${tenant}_${cleanKey}`;
          const targetKey2 = `kaenpro_rafael_${cleanKey}`;
          const strVal = JSON.stringify(v);
          if (localStorage.getItem(targetKey1) !== strVal) {
            localStorage.setItem(targetKey1, strVal);
            anyChanged = true;
          }
          if (localStorage.getItem(targetKey2) !== strVal) {
            localStorage.setItem(targetKey2, strVal);
          }
        }
      } finally {
        isApplyingRemoteUpdate = false;
      }
      if (anyChanged) {
        window.dispatchEvent(new CustomEvent('kaen_storage_updated'));
      }
      setSyncStatus(SyncStatus.SYNCED);
    });

    // 5. Force Cloud Backup listener
    const handleForceBackup = async () => {
      setSyncStatus(SyncStatus.SYNCING);
      try {
        const allLocalData: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('kaenpro_') || key.startsWith('kaen_'))) {
            try {
              allLocalData[key] = JSON.parse(localStorage.getItem(key) || 'null');
            } catch (e) {
              allLocalData[key] = localStorage.getItem(key);
            }
          }
        }

        // Direct Firestore writes
        for (const [k, val] of Object.entries(allLocalData)) {
          if (val !== null && typeof val !== 'undefined') {
            await saveWorkshopFieldToCloud(k, val);
          }
        }

        // Server API bulk persistence
        await fetch('/api/cloud-sync-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allLocalData)
        });

        console.log("☁️ Forced full cloud backup completed successfully!");
      } catch (err) {
        console.error("Forced cloud backup error:", err);
      } finally {
        setSyncStatus(SyncStatus.SYNCED);
      }
    };
    window.addEventListener('kaen_force_cloud_backup', handleForceBackup);

    return () => {
      eventSource?.close();
      unsubscribeCloud();
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleSyncTrigger);
      document.removeEventListener('visibilitychange', handleSyncTrigger);
      window.removeEventListener('kaen_force_cloud_backup', handleForceBackup);
    };
  }, [session]);

  const performCloudSync = useCallback(async (action: string) => {
    setSyncStatus(SyncStatus.SYNCING);
    await new Promise(r => setTimeout(r, 600));
    setSyncStatus(SyncStatus.SYNCED);
  }, []);

  const handleLogin = (username: string, role: UserRole, realUsername: string, activeUser: string) => {
    const newSession: UserSession = { 
      username, // always "rafael" (tenant)
      activeUser, // e.g. "eduardo"
      realUsername, // e.g. "Eduardo Maciel"
      role, 
      lastSync: new Date().toISOString() 
    };
    setSession(newSession);
    sessionStorage.setItem('kaen_session', JSON.stringify(newSession));
    performCloudSync('Full Fetch');
  };

  const handleLogout = (forgetDevice: boolean = false) => {
    setSession(null);
    setWorkspaceMode('PRINCIPAL');
    sessionStorage.removeItem('kaen_session');
    sessionStorage.removeItem('kaen_admin_unlocked');
    if (forgetDevice) {
      localStorage.removeItem('kaen_trusted_device');
    }
  };

  const syncData = async (key: string, data: any) => {
    if (!session) return;
    const tenant = session.username;
    const userKey = `kaenpro_${tenant}_${key}`;
    const sharedKey = `kaenpro_rafael_${key}`;
    localStorage.setItem(userKey, JSON.stringify(data));
    localStorage.setItem(sharedKey, JSON.stringify(data));
    
    setSyncStatus(SyncStatus.SYNCING);
    try {
      // 1. Direct Firebase Firestore cloud sync
      saveWorkshopFieldToCloud(sharedKey, data).catch((err) => {
        console.warn("Direct Firestore write notification:", err);
      });

      // 2. Server API sync and SSE broadcast
      await fetch(`/api/sync/${tenant}/${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      // Fire internal update as well for instant single-page refresh
      window.dispatchEvent(new CustomEvent('kaen_storage_updated', { detail: { key, value: data } }));
    } catch (e) {
      console.error("Network cloud synchronization failed, queued locally.", e);
    }
    setSyncStatus(SyncStatus.SYNCED);
  };

  const handleWorkspaceModeChange = (mode: WorkspaceMode) => {
    if (!session) return;

    if (mode === 'ADMIN' && !isAdminRole(session.role)) {
      alert("ACESSO RECUSADO: Apenas Administradores podem acessar as configurações globais do sistema.");
      return;
    }
    if (mode === 'RECEPCAO' && isMechanicRole(session.role)) {
      alert("ACESSO RECUSADO: Mecânicos de pista não têm permissão de acesso à Recepção.");
      return;
    }
    if (mode === 'MECANICO' && isReceptionRole(session.role)) {
      alert("ACESSO RECUSADO: A recepção não tem acesso ao Terminal de Pista Técnico.");
      return;
    }

    setWorkspaceMode(mode);
  };

  const layoutProps = {
    session,
    syncStatus,
    workspaceMode,
    onLogout: handleLogout,
    onWorkspaceModeChange: handleWorkspaceModeChange,
    syncData
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/dashboard" element={<PrivateLayout {...layoutProps}><Dashboard /></PrivateLayout>} />
        <Route path="/patio" element={<PrivateLayout {...layoutProps}><PatioBoard /></PrivateLayout>} />
        <Route path="/quality" element={<PrivateLayout {...layoutProps}><QualityControl /></PrivateLayout>} />
        <Route path="/calendar" element={<PrivateLayout {...layoutProps}><Calendar /></PrivateLayout>} />
        <Route path="/orders" element={<PrivateLayout {...layoutProps}><ServiceOrders role={session?.role} /></PrivateLayout>} />
        <Route path="/orders/new" element={<PrivateLayout {...layoutProps}><NewServiceOrder /></PrivateLayout>} />
        <Route path="/new-order" element={<PrivateLayout {...layoutProps}><NewServiceOrder /></PrivateLayout>} />
        <Route path="/billing" element={<PrivateLayout {...layoutProps}><Billing /></PrivateLayout>} />
        <Route path="/fiscal" element={<PrivateLayout {...layoutProps}><Billing /></PrivateLayout>} />
        <Route path="/financial" element={<PrivateLayout {...layoutProps}><Financial /></PrivateLayout>} />
        <Route path="/inventory" element={<PrivateLayout {...layoutProps}><Inventory /></PrivateLayout>} />
        <Route path="/clients" element={<PrivateLayout {...layoutProps}><Clients role={session?.role || 'Dono'} /></PrivateLayout>} />
        <Route path="/clients/:id" element={<PrivateLayout {...layoutProps}><ClientDetails role={session?.role || 'Dono'} /></PrivateLayout>} />
        <Route path="/vehicles" element={<PrivateLayout {...layoutProps}><Vehicles /></PrivateLayout>} />
        <Route path="/vehicles/:id" element={<PrivateLayout {...layoutProps}><VehicleDetails /></PrivateLayout>} />
        <Route path="/employees" element={<PrivateLayout {...layoutProps}><Employees /></PrivateLayout>} />
        <Route path="/ai-marketing" element={<PrivateLayout {...layoutProps}><AiAssistant /></PrivateLayout>} />
        <Route path="/project-dossier" element={<PrivateLayout {...layoutProps}><ProjectDocument session={session} syncData={syncData} /></PrivateLayout>} />
        <Route path="/terminal" element={<PrivateLayout {...layoutProps}><MechanicTerminal session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="/budgets" element={<PrivateLayout {...layoutProps}><Budgets session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="/checklists" element={<PrivateLayout {...layoutProps}><ChecklistsView session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="/suppliers" element={<PrivateLayout {...layoutProps}><Suppliers session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="/reports" element={<PrivateLayout {...layoutProps}><Reports session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="/marketing" element={<PrivateLayout {...layoutProps}><Marketing session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="/reviews" element={<PrivateLayout {...layoutProps}><Reviews session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="/after-sales" element={<PrivateLayout {...layoutProps}><AfterSales session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="/whatsapp" element={<PrivateLayout {...layoutProps}><WhatsAppHub session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="/gallery" element={<PrivateLayout {...layoutProps}><Gallery session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="/settings" element={<PrivateLayout {...layoutProps}><AdminPanel session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="/users" element={<PrivateLayout {...layoutProps}><AdminPanel session={session!} syncData={syncData} /></PrivateLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
