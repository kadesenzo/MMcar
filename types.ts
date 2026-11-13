export enum OSStatus {
  AGUARDANDO_DIAGNOSTICO = 'Aguardando diagnóstico',
  EM_DIAGNOSTICO = 'Em diagnóstico',
  ORCAMENTO_ENVIADO = 'Orçamento enviado',
  AGUARDANDO_APROVACAO = 'Aguardando aprovação',
  EM_SERVICO = 'Em serviço',
  FINALIZACAO = 'Finalização',
  PRONTO = 'Pronto',
  ENTREGUE = 'Entregue',
  // Legado para compatibilidade
  ORCAMENTO = 'Orçamento',
  EM_ANDAMENTO = 'Em Execução',
  FINALIZADO = 'Finalizado',
  CANCELADO = 'Cancelado'
}

export enum PaymentStatus {
  PAGO = 'Pago',
  PENDENTE = 'Pendente',
  ATRASADO = 'Atrasado'
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum PaymentMethod {
  PIX = 'PIX',
  DINHEIRO = 'Dinheiro',
  CARTAO_CREDITO = 'Cartão de Crédito',
  CARTAO_DEBITO = 'Cartão de Débito',
  OUTRO = 'Outro'
}

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  method: PaymentMethod;
  description: string;
  relatedId?: string;
  date: string;
}

export enum SyncStatus {
  SYNCED = 'Synced',
  SYNCING = 'Syncing',
  OFFLINE = 'Offline',
  ERROR = 'Error'
}

export type UserRole = 'Dono' | 'Gerente' | 'Recepção' | 'Mecânico' | 'Estoque' | 'Funcionário';

export interface UserSession {
  username: string;
  activeUser: string;
  realUsername: string;
  role: UserRole;
  lastSync: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  shift: string;
  services: number;
  status: 'Ativo' | 'Inativo';
  commissionRate?: number;
  specialty?: string;
  phone?: string;
  createdAt: string;
}

export interface Part {
  id: string;
  name: string;
  sku: string;
  brand?: string;
  supplier?: string;
  category?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  location?: string;
}

export interface PartRequest {
  id: string;
  osId: string;
  osNumber: string;
  vehiclePlate: string;
  vehicleModel: string;
  mechanicName: string;
  partId?: string;
  partName: string;
  sku?: string;
  quantity: number;
  urgency: 'NORMAL' | 'URGENTE';
  notes?: string;
  status: 'PENDENTE' | 'ATENDIDA' | 'RECUSADA';
  requestedAt: string;
  fulfilledBy?: string;
  fulfilledAt?: string;
  refusalReason?: string;
}

export interface StockMovement {
  id: string;
  type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT';
  partId: string;
  partName: string;
  sku?: string;
  quantity: number;
  unitCost: number;
  unitSale?: number;
  osId?: string;
  osNumber?: string;
  supplierName?: string;
  reason: string;
  userName: string;
  date: string;
}

export interface WorkshopBox {
  id: string;
  code: string;
  name: string;
  type: 'ELEVADOR' | 'VALA' | 'DIAGNOSTICO' | 'ALINHAMENTO' | 'BOX_RAPIDO';
  status: 'LIVRE' | 'OCUPADO' | 'MANUTENCAO';
  osId?: string;
  osNumber?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  mechanicName?: string;
  occupiedSince?: string;
  updatedAt: string;
}

export interface AccountEntry {
  id: string;
  kind: 'PAGAR' | 'RECEBER';
  title: string;
  partyName: string;
  category: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: 'ABERTO' | 'PAGO' | 'ATRASADO';
  method?: PaymentMethod;
  osId?: string;
  osNumber?: string;
  supplierId?: string;
  notes?: string;
  createdAt: string;
}

export interface CashClosing {
  id: string;
  date: string;
  openedBy: string;
  closedBy: string;
  openingBalance: number;
  totalPix: number;
  totalCard: number;
  totalCash: number;
  totalOther: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  countedCash: number;
  difference: number;
  notes?: string;
  closedAt: string;
}

export interface FiscalConfig {
  companyName: string;
  tradeName: string;
  cnpj: string;
  ie: string;
  im: string;
  address?: string;
  phone?: string;
  email?: string;
  cityState?: string;
  taxRegime: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  environment: 'HOMOLOGACAO' | 'PRODUCAO';
  providerName: string;
  certificateStatus: 'ATIVO' | 'PENDENTE' | 'VENCIDO';
  certificateExpiresAt?: string;
  nfeSeries: string;
  nfceSeries: string;
  nfseSeries: string;
  defaultIssRate: number;
  defaultIcmsRate: number;
  updatedAt: string;
}

export interface FiscalDocument {
  id: string;
  type: 'NF-E' | 'NFC-E' | 'NFS-E';
  number: string;
  series: string;
  osId?: string;
  osNumber?: string;
  clientName: string;
  clientDocument?: string;
  vehiclePlate?: string;
  partsValue: number;
  servicesValue: number;
  totalValue: number;
  taxesEstimated: number;
  accessKey: string;
  protocolNumber: string;
  status: 'AUTORIZADA' | 'CONTINGENCIA' | 'CANCELADA';
  environment: 'HOMOLOGACAO' | 'PRODUCAO';
  issuedBy: string;
  issuedAt: string;
  notes?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  category: 'PATIO' | 'ESTOQUE' | 'MECANICO' | 'FINANCEIRO' | 'QUALIDADE' | 'SISTEMA';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  targetRoles?: UserRole[];
  relatedPath?: string;
  relatedId?: string;
  readBy: string[];
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  document: string;
  email?: string;
  address?: string;
  observations: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  clientId: string;
  model: string;
  brand: string;
  year: string;
  plate: string;
  km: number;
  engine?: string;
  fuel?: string;
  color?: string;
  observations?: string;
}

export interface OSItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  partId?: string;
  type: 'PART' | 'SERVICE';
}

export interface ProofPhoto {
  id: string;
  type: 'BEFORE' | 'DURING' | 'AFTER' | 'ENTRY' | 'DAMAGE';
  label: string;
  url: string;
  timestamp: string;
}

export interface ChecklistCategoryEval {
  key: string;
  label: string;
  status: 'OK' | 'ATENCAO' | 'AVARIA';
  notes: string;
  photos?: string[];
}

export interface VehicleChecklist {
  fuelLevel: string;
  damages: string[];
  items: Record<string, boolean>;
  categories?: Record<string, ChecklistCategoryEval>;
  accessoriesLeft?: string;
  preExistingDamages?: string;
  clientConfirmed?: boolean;
  clientConfirmedBy?: string;
  clientConfirmedAt?: string;
  kmEntry?: string;
  kmExit?: string;
  observations: string;
  mechanicName?: string;
  inspectionDate?: string;
  testDrivePassed?: boolean;
  exitChecklist?: {
    toolsChecked: boolean;
    interiorClean: boolean;
    exteriorClean: boolean;
    kmChecked: boolean;
    finalTestPassed: boolean;
    finalPhotosDone: boolean;
  };
  photos?: { label: string; url: string }[];
  proofPhotos?: ProofPhoto[];
}

export interface OSTimelineEvent {
  id: string;
  action: string;
  description: string;
  user: string;
  role?: string;
  timestamp: string;
  field?: string;
  previousValue?: string;
  newValue?: string;
}

export interface MechanicWorkLog {
  id: string;
  mechanicName: string;
  action: 'INICIOU' | 'PAUSOU' | 'RETOMOU' | 'ATIVIDADE' | 'AJUDA' | 'FINALIZOU';
  reason?: string;
  notes?: string;
  elapsedMinutes?: number;
  timestamp: string;
}

export interface BudgetRevision {
  id: string;
  version: number;
  updatedBy: string;
  totalValue: number;
  discount: number;
  itemsCount: number;
  summary: string;
  status: 'ENVIADO' | 'APROVADO' | 'RECUSADO' | 'REVISADO';
  timestamp: string;
}

export interface QualityInspection {
  inspectedBy: string;
  inspectedAt: string;
  passed: boolean;
  roadTestOk: boolean;
  torqueCheckOk: boolean;
  cleanlinessOk: boolean;
  lightsAndPanelOk: boolean;
  notes: string;
  reworkReason?: string;
}

export interface ServiceOrder {
  id: string;
  osNumber: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleKm?: string;
  kmExit?: string;
  boxNumber?: string;
  receptionistName?: string;
  problem: string;
  diagnosticNotes?: string;
  items: OSItem[];
  laborValue: number;
  discount: number;
  totalValue: number;
  status: OSStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  observations?: string;
  dueDate?: string;
  mechanicResponsible?: string;
  assignedMechanics?: string[];
  mechanicStatus?: 'NAO_INICIADO' | 'EM_EXECUCAO' | 'PAUSADO' | 'CONCLUIDO';
  pauseReason?: string;
  workStartedAt?: string;
  accumulatedMinutes?: number;
  mechanicWorkLogs?: MechanicWorkLog[];
  budgetApproved?: boolean;
  budgetRejected?: boolean;
  budgetRejectionReason?: string;
  budgetRevisions?: BudgetRevision[];
  approvedAt?: string;
  readyNotified?: boolean;
  qualityInspection?: QualityInspection;
  isRework?: boolean;
  reworkCount?: number;
  reworkReason?: string;
  warrantyDays?: number;
  warrantyExpiresAt?: string;
  deliveredAt?: string;
  deliveredTo?: string;
  timeline?: OSTimelineEvent[];
  postSalesHistory?: {
    day1Sent?: boolean;
    day7Sent?: boolean;
    day30Sent?: boolean;
    nextReviewDate?: string;
  };
  billingHistory?: (
    | { date: string; amount: number; method: string }
    | { date: string; user: string; level: 'mild' | 'formal' | 'final' }
  )[];
  checklist?: VehicleChecklist;
  photos?: { label: string; url: string }[];
  proofPhotos?: ProofPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  vehiclePlate: string;
  serviceType: string;
  date: string;
  time: string;
  status: string;
  attemptsCount: number;
  notes?: string;
  mechanicResponsible?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  cnpj?: string;
  category: string;
  products: string;
  paymentTerms: string;
  rating?: number;
  notes?: string;
  createdAt: string;
}

export interface CustomerReview {
  id: string;
  clientName: string;
  clientPhone?: string;
  vehicleModel?: string;
  osId?: string;
  rating: number; // 1 to 5
  feedback: string;
  source: 'WhatsApp' | 'Google' | 'Presencial';
  date: string;
  status: 'Avaliado' | 'Aguardando Avaliação' | 'Respondido';
}

export interface MarketingLead {
  id: string;
  name: string;
  phone: string;
  vehicleModel?: string;
  origin: 'Instagram' | 'Google' | 'Indicação' | 'Anúncios' | 'WhatsApp' | 'Outro';
  stage: 'Lead' | 'Contato' | 'Orçamento' | 'Agendamento' | 'Serviço' | 'Cliente Recorrente';
  estimatedValue?: number;
  notes?: string;
  createdAt: string;
  lastContactDate?: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: 'Checklists' | 'Procedimentos Internos' | 'Padrões de Atendimento' | 'Fornecedores' | 'Treinamentos';
  summary: string;
  content: string;
  author: string;
  updatedAt: string;
}
