export type UserRole = 'tecnico' | 'commerciale' | 'amministratore';
export type PlantStatus = 'complete' | 'incomplete' | 'needs-review';
export type SurveyStatus = 'draft' | 'sent' | 'review';
export type PreventivoStatus = 'DRAFT' | 'TO_REVIEW' | 'QUOTING' | 'CONFIRMED' | 'NEEDS_INTEGRATION';
export type RilievoStatus = 'DRAFT' | 'SUBMITTED' | 'NEEDS_INTEGRATION' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMMERCIAL_REVIEW';
export type PipelineStatus =
  | 'new-survey'
  | 'to-review'
  | 'quoting'
  | 'waiting-supplier'
  | 'ready'
  | 'sent'
  | 'accepted';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  title: string;
  online: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'photo' | 'document';
  url: string;
  validated: boolean;
}

export interface InspectionAttachment {
  id?: string;
  fileName: string;
  url?: string;
  contentType?: string;
}

export interface CustomerPlant {
  id: string;
  customerName: string;
  plantCode?: string;
  serial?: string;
  address?: string;
  type?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  categoryName?: string;
  shortDescription?: string;
  standardLaborHours?: number;
  listMaterialPrice?: number;
}

export interface CreateCatalogItemRequest {
  name: string;
  category: string;
  shortDescription?: string;
}

export interface InspectionItem {
  id?: string;
  catalogItemId: string;
  catalogItemName: string;
  categoryName?: string;
  laborHours: number;
  materialCost: number;
  photos: InspectionAttachment[];
  rawNote?: string;
  transcribedNote?: string;
  originalTechnicalDescription?: string;
  formalizedDescription?: string;
  pendingOperation?: boolean;
}

export interface InspectionDraft {
  id?: string;
  customerId: string;
  customerName: string;
  plantCode?: string;
  plantAddress?: string;
  status: RilievoStatus;
  technicianId: string;
  technicianName: string;
  items: InspectionItem[];
  totalLaborHours: number;
  totalMaterialCost: number;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
}

export interface VoiceNote {
  id: string;
  title: string;
  duration: string;
  transcript: string;
}

export interface Plant {
  id: string;
  customer: string;
  address: string;
  code: string;
  serial: string;
  type: string;
  brand: string;
  model: string;
  estimatedYear: number;
  notes: string;
  completeness: number;
  status: PlantStatus;
  lastSurvey: string;
  assignedTo?: string;
  assignmentCode?: string;
  assignmentTitle?: string;
  assignmentDueDate?: string;
  attachments: Attachment[];
}

export interface SurveyStep {
  id: number;
  title: string;
  complete: boolean;
}

export interface Survey {
  id: string;
  plantId: string;
  technician: string;
  status: SurveyStatus;
  reliability: number;
  completedFields: string[];
  missingFields: string[];
  aiSuggestions: string[];
  createdAt: string;
  sentAt?: string;
  notes: string;
  voiceNotes: VoiceNote[];
  attachments: Attachment[];
}

export interface ComponentSuggestion {
  id: string;
  name: string;
  sku: string;
  compatible: boolean;
  confidence: number;
  supplier: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  margin: number;
}

export interface ActivityLog {
  id: string;
  actor: string;
  action: string;
  date: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

export interface Quote {
  id: string;
  surveyId: string;
  customer: string;
  plantCode: string;
  title: string;
  status: PipelineStatus;
  priority: 'Alta' | 'Media' | 'Bassa';
  assignee: string;
  lastUpdated: string;
  estimatedValue: number;
  technicalValidation: 'Validato' | 'Da verificare' | 'In attesa integrazione';
  components: ComponentSuggestion[];
  items: QuoteItem[];
  activities: ActivityLog[];
  internalComments: string[];
}

export interface CommercialQuoteListItem extends Quote {
  statusLabel: PreventivoStatus;
  quoteId?: string;
  inspectionId: string;
  hasQuote: boolean;
  inspectionStatus: RilievoStatus;
  technicianId: string;
  technicianName: string;
}

export interface CommercialQuoteRow {
  id: string;
  description: string;
  sku: string;
  quantity: number;
  laborHours: number;
  laborTotal: number;
  materialUnitPrice: number;
  materialTotal: number;
  margin: number;
  technicalNote: string;
}

export interface CommercialQuoteDetail extends Quote {
  statusLabel: PreventivoStatus;
  sheetNumber: string;
  customerDetail: {
    name: string;
    email: string;
    phone: string;
    city: string;
  };
  plant: {
    code: string;
    serial: string;
    address: string;
    type: string;
  };
  inspection?: {
    id: string;
    customerName: string;
    plantCode: string;
    status: RilievoStatus;
    technicianId: string;
    technicianName: string;
    submittedAt?: string;
    updatedAt?: string;
  };
  rows: CommercialQuoteRow[];
  totals: {
    labor: number;
    material: number;
    margin: number;
    finalPrice: number;
  };
}

export interface QuoteDocument {
  quoteId: string;
  number: string;
  date: string;
  version: string;
  language: string;
  currency: string;
  template: string;
  premise: string;
  paymentMethod: string;
  closingConditions: string;
  finalNotes: string;
  includes: string;
  excludes: string;
  offerValidity: string;
  deliveryTime: string;
  warranty: string;
  customClauses: QuoteClause[];
}

export interface QuoteClause {
  title: string;
  text: string;
}

export interface CommercialTechnician {
  id: string;
  name: string;
  email: string;
  title: string;
}

export interface CommercialCustomer {
  id: string;
  name: string;
  city: string;
  email: string;
  phone?: string;
}

export interface CommercialPlantOption {
  id: string;
  customerId: string;
  customerName: string;
  code: string;
  serial?: string;
  address: string;
  city?: string;
  type: string;
}

export interface CommercialAssignment {
  id: string;
  code: string;
  technicianId: string;
  technicianName: string;
  plantId: string;
  customerName: string;
  plantCode: string;
  address: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate?: string;
  createdAt?: string;
}

export interface CreateIntegrationRequest {
  reason: string;
  notes: string;
  fields: string;
}

export interface IntegrationRequest {
  id: string;
  quoteId: string;
  quoteTitle: string;
  inspectionId: string;
  technicianId?: string;
  customerName: string;
  plantCode: string;
  reason: string;
  notes: string;
  fields: string;
  status: 'OPEN' | 'RESOLVED' | string;
  createdAt: string;
}

export interface CommercialDashboardKpi {
  label: string;
  value: string;
  trend: string;
  trendTone: 'up' | 'warn' | 'flat';
}

export interface CommercialDashboardInspection {
  id: string;
  customerName: string;
  plantCode: string;
  technicianName: string;
  status: string;
  updatedAt: string;
}

export interface CommercialDashboardCustomer {
  id: string;
  name: string;
  city: string;
  email: string;
}

export interface CommercialDashboardTrendPoint {
  label: string;
  value: number;
}

export interface CommercialDashboard {
  kpis: CommercialDashboardKpi[];
  recentInspections: CommercialDashboardInspection[];
  recentQuotes: Quote[];
  recentCustomers: CommercialDashboardCustomer[];
  opportunityTrend: CommercialDashboardTrendPoint[];
}
