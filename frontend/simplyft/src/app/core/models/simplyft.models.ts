export type UserRole = 'technician' | 'office';
export type PlantStatus = 'complete' | 'incomplete' | 'needs-review';
export type SurveyStatus = 'draft' | 'sent' | 'review';
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
