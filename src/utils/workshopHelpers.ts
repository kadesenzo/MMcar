import {
  OSStatus,
  ServiceOrder,
  UserRole,
  WorkshopBox,
  SystemNotification,
  OSTimelineEvent,
  FiscalConfig,
  ChecklistCategoryEval
} from '../../types';

// ============================================================
// ROLE & PERMISSION HELPERS
// ============================================================
export function isAdminRole(role?: string): boolean {
  return role === 'Dono' || role === 'Gerente';
}

export function isMechanicRole(role?: string): boolean {
  return role === 'Mecânico' || role === 'Funcionário';
}

export function isReceptionRole(role?: string): boolean {
  return role === 'Recepção';
}

export function isStockRole(role?: string): boolean {
  return role === 'Estoque';
}

export function getRoleLabel(role?: string): string {
  switch (role) {
    case 'Dono':
      return 'Diretoria Master';
    case 'Gerente':
      return 'Gerência Operacional';
    case 'Recepção':
      return 'Recepção & Pátio';
    case 'Mecânico':
    case 'Funcionário':
      return 'Mecânico Especialista';
    case 'Estoque':
      return 'Gestão de Estoque';
    default:
      return role || 'Operador';
  }
}

// ============================================================
// STORAGE READ / WRITE HELPERS (preserving kaenpro_ sync keys)
// ============================================================
export function getTenantStorageKey(tenant: string, key: string): string {
  return `kaenpro_${tenant || 'rafael'}_${key}`;
}

export function readWorkshopData<T>(tenant: string, key: string, fallback: T): T {
  try {
    const primary = localStorage.getItem(`kaenpro_${tenant || 'rafael'}_${key}`);
    if (primary) return JSON.parse(primary);
    const shared = localStorage.getItem(`kaenpro_rafael_${key}`);
    if (shared) return JSON.parse(shared);
    const legacy = localStorage.getItem(`kaen_${key}`);
    if (legacy) return JSON.parse(legacy);
  } catch {
    // ignore corrupted JSON
  }
  return fallback;
}

export function writeWorkshopData<T>(tenant: string, key: string, value: T): void {
  const serialized = JSON.stringify(value);
  localStorage.setItem(`kaenpro_${tenant || 'rafael'}_${key}`, serialized);
  if (tenant && tenant !== 'rafael') {
    localStorage.setItem(`kaenpro_rafael_${key}`, serialized);
  }
  window.dispatchEvent(new Event('kaen_storage_updated'));
}

// ============================================================
// 10 MANDATORY PATIO CHECKLIST CATEGORIES
// ============================================================
export const PATIO_CHECKLIST_CATEGORIES: { key: string; label: string; hint: string }[] = [
  { key: 'lataria_pintura', label: 'Lataria e Pintura', hint: 'Riscos, amassados, portas, capô, teto' },
  { key: 'parachoques_retrovisores', label: 'Para-choques e Retrovisores', hint: 'Alinhamento, travas, lentes, capas' },
  { key: 'vidros_farois', label: 'Vidros e Faróis', hint: 'Para-brisa, lanternas, faróis, palhetas' },
  { key: 'pneus_rodas', label: 'Pneus e Rodas', hint: 'Sulcos, calibragem, rodas, estepe' },
  { key: 'interior_bancos', label: 'Interior e Bancos', hint: 'Estofado, tapetes, forros, cintos' },
  { key: 'painel_luzes', label: 'Painel e Luzes de Advertência', hint: 'Injeção, ABS, airbag, bateria, óleo' },
  { key: 'combustivel', label: 'Nível de Combustível', hint: 'Marcador na entrada e tampa do tanque' },
  { key: 'acessorios_objetos', label: 'Acessórios e Objetos Deixados', hint: 'Chave reserva, manual, som, pertences' },
  { key: 'avarias_preexistentes', label: 'Avarias Preexistentes', hint: 'Danos prévios confirmados com o cliente' },
  { key: 'observacoes_adicionais', label: 'Observações Adicionais', hint: 'Ruídos relatados, vazamentos ou alertas' },
];

export function createDefaultPatioCategories(): Record<string, ChecklistCategoryEval> {
  const map: Record<string, ChecklistCategoryEval> = {};
  for (const cat of PATIO_CHECKLIST_CATEGORIES) {
    map[cat.key] = {
      key: cat.key,
      label: cat.label,
      status: 'OK',
      notes: '',
      photos: []
    };
  }
  return map;
}

// ============================================================
// WORKSHOP BOXES SEED (BOX 01 - BOX 08)
// ============================================================
export const DEFAULT_WORKSHOP_BOXES: WorkshopBox[] = [
  { id: 'box-01', code: 'BOX 01', name: 'Elevador Pesado 01', type: 'ELEVADOR', status: 'LIVRE', updatedAt: new Date().toISOString() },
  { id: 'box-02', code: 'BOX 02', name: 'Elevador Pórtico 02', type: 'ELEVADOR', status: 'LIVRE', updatedAt: new Date().toISOString() },
  { id: 'box-03', code: 'BOX 03', name: 'Elevador Hidráulico 03', type: 'ELEVADOR', status: 'LIVRE', updatedAt: new Date().toISOString() },
  { id: 'box-04', code: 'BOX 04', name: 'Elevador Hidráulico 04', type: 'ELEVADOR', status: 'LIVRE', updatedAt: new Date().toISOString() },
  { id: 'box-05', code: 'BOX 05', name: 'Box Diagnóstico / Scanner', type: 'DIAGNOSTICO', status: 'LIVRE', updatedAt: new Date().toISOString() },
  { id: 'box-06', code: 'BOX 06', name: 'Rampa Alinhamento 3D', type: 'ALINHAMENTO', status: 'LIVRE', updatedAt: new Date().toISOString() },
  { id: 'box-07', code: 'BOX 07', name: 'Box Revisão Rápida', type: 'BOX_RAPIDO', status: 'LIVRE', updatedAt: new Date().toISOString() },
  { id: 'box-08', code: 'BOX 08', name: 'Área de Finalização / Qualidade', type: 'BOX_RAPIDO', status: 'LIVRE', updatedAt: new Date().toISOString() },
];

export function loadOrInitBoxes(tenant: string, orders: ServiceOrder[] = []): WorkshopBox[] {
  const existing = readWorkshopData<WorkshopBox[]>(tenant, 'boxes', []);
  const base = existing.length > 0 ? existing : DEFAULT_WORKSHOP_BOXES;

  // Sync box occupancy dynamically with active orders that specify boxNumber
  const activeStatuses = new Set<string>([
    OSStatus.AGUARDANDO_DIAGNOSTICO,
    OSStatus.EM_DIAGNOSTICO,
    OSStatus.ORCAMENTO_ENVIADO,
    OSStatus.AGUARDANDO_APROVACAO,
    OSStatus.EM_SERVICO,
    OSStatus.EM_ANDAMENTO,
    OSStatus.FINALIZACAO,
    OSStatus.PRONTO
  ]);

  const normalizeBoxRef = (val?: string) => (val || '').trim().toUpperCase().replace(/\s+/g, '');

  return base.map((box) => {
    if (box.status === 'MANUTENCAO') return box;
    const normCode = normalizeBoxRef(box.code);
    const normId = normalizeBoxRef(box.id);
    const assignedOs = orders.find((o) => {
      if (!activeStatuses.has(o.status)) return false;
      const normOrderBox = normalizeBoxRef(o.boxNumber);
      return normOrderBox !== '' && (normOrderBox === normCode || normOrderBox === normId);
    });
    if (assignedOs) {
      return {
        ...box,
        status: 'OCUPADO',
        osId: assignedOs.id,
        osNumber: assignedOs.osNumber,
        vehiclePlate: assignedOs.vehiclePlate,
        vehicleModel: assignedOs.vehicleModel,
        mechanicName: assignedOs.mechanicResponsible || assignedOs.assignedMechanics?.[0] || 'A definir',
        occupiedSince: assignedOs.updatedAt || assignedOs.createdAt,
        updatedAt: assignedOs.updatedAt || box.updatedAt
      };
    }
    const { osId: _oId, osNumber: _oNum, vehiclePlate: _vP, vehicleModel: _vM, mechanicName: _mN, occupiedSince: _oS, ...cleanBox } = box;
    return {
      ...cleanBox,
      status: 'LIVRE'
    };
  });
}

// ============================================================
// DEFAULT FISCAL CONFIG
// ============================================================
export const DEFAULT_FISCAL_CONFIG: FiscalConfig = {
  companyName: 'MM CAR AUTO CENTER LTDA',
  tradeName: 'MM Car Auto Center',
  cnpj: '42.819.504/0001-88',
  ie: '598.120.440.118',
  im: '884120-9',
  taxRegime: 'SIMPLES_NACIONAL',
  environment: 'HOMOLOGACAO',
  providerName: 'Focus NFe / SEFAZ Integrado',
  certificateStatus: 'ATIVO',
  certificateExpiresAt: new Date(Date.now() + 240 * 86400000).toISOString().split('T')[0],
  nfeSeries: '001',
  nfceSeries: '001',
  nfseSeries: 'RPS',
  defaultIssRate: 3.5,
  defaultIcmsRate: 18,
  updatedAt: new Date().toISOString()
};

// ============================================================
// AUDIT LOG, TIMELINE & NOTIFICATION HELPERS
// ============================================================
export function appendAuditLog(
  tenant: string,
  user: string,
  action: string,
  target: string,
  details?: string
): void {
  const logs = readWorkshopData<any[]>(tenant, 'admin_logs', []);
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    user: user || 'Sistema',
    action,
    target,
    details: details || ''
  };
  writeWorkshopData(tenant, 'admin_logs', [entry, ...logs].slice(0, 400));
}

export function createOSTimelineEvent(
  action: string,
  description: string,
  user: string,
  role?: string,
  extra?: { field?: string; previousValue?: string; newValue?: string }
): OSTimelineEvent {
  return {
    id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    description,
    user: user || 'Sistema',
    role,
    timestamp: new Date().toISOString(),
    ...extra
  };
}

export function pushSystemNotification(
  tenant: string,
  params: {
    title: string;
    message: string;
    category: SystemNotification['category'];
    severity: SystemNotification['severity'];
    targetRoles?: UserRole[];
    relatedPath?: string;
    relatedId?: string;
  }
): void {
  const list = readWorkshopData<SystemNotification[]>(tenant, 'notifications', []);
  const item: SystemNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...params,
    readBy: [],
    createdAt: new Date().toISOString()
  };
  writeWorkshopData(tenant, 'notifications', [item, ...list].slice(0, 120));
}

// ============================================================
// BOTTLENECK / STALLED VEHICLE CHECK (> 48h without update)
// ============================================================
export function getVehicleStalledHours(order: ServiceOrder): number {
  const ref = order.updatedAt || order.createdAt;
  const diffMs = Date.now() - new Date(ref).getTime();
  return Math.max(0, Math.floor(diffMs / 3600000));
}

export function isActiveWorkshopStatus(status: OSStatus | string): boolean {
  return ![
    OSStatus.ENTREGUE,
    OSStatus.FINALIZADO,
    OSStatus.CANCELADO
  ].includes(status as OSStatus);
}

export function isOrderStalled(order: ServiceOrder, thresholdHours = 48): boolean {
  if (!isActiveWorkshopStatus(order.status)) return false;
  return getVehicleStalledHours(order) >= thresholdHours;
}

export function calculateOSPartsCost(order: ServiceOrder, partsCatalog: { id?: string; name: string; costPrice: number }[]): number {
  return (order.items || []).reduce((acc, item) => {
    if (item.type !== 'PART') return acc;
    if (typeof item.costPrice === 'number' && item.costPrice > 0) {
      return acc + item.costPrice * item.quantity;
    }
    const found = partsCatalog.find(
      (p) => (item.partId && p.id === item.partId) || p.name.toLowerCase() === item.description.toLowerCase()
    );
    const estCost = found ? found.costPrice : item.unitPrice * 0.6;
    return acc + estCost * item.quantity;
  }, 0);
}
