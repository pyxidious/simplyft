import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArchive,
  faArrowRight,
  faCheck,
  faCircleInfo,
  faChevronRight,
  faClock,
  faClipboardList,
  faEuroSign,
  faExclamationTriangle,
  faFileInvoice,
  faFilter,
  faMagnifyingGlass,
  faPaperPlane,
  faRotateRight,
  faTrophy,
  faUser,
  faWandMagicSparkles
} from '@fortawesome/free-solid-svg-icons';
import { CommercialQuoteListItem, PipelineStatus } from '../../../core/models/simplyft.models';
import { PipelineCommercialeService } from '../../../core/services/pipeline-commerciale.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

type StageMeta = {
  icon: IconDefinition;
  description: string;
  accent: string;
};

type FlowStep = {
  status: PipelineStatus;
  title: string;
  description: string;
  icon: IconDefinition;
  accent: string;
  quotes: CommercialQuoteListItem[];
  totalValue: number;
  highPriority: number;
};

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, StatusBadgeComponent],
  templateUrl: './pipeline.component.html',
  styleUrl: './pipeline.component.css'
})
export class PipelineComponent implements OnInit {
  query = signal('');
  priority = signal('all');
  assignee = signal('all');
  stageFilter = signal<PipelineStatus | 'all'>('all');
  selectedStageKey = signal<string>('');

  readonly icons = {
    arrow: faArrowRight,
    fallback: faCircleInfo,
    chevron: faChevronRight,
    clock: faClock,
    filter: faFilter,
    money: faEuroSign,
    reset: faRotateRight,
    search: faMagnifyingGlass,
    user: faUser
  };

  private readonly stageMeta: Record<PipelineStatus, StageMeta> = {
    'new-survey': {
      icon: faWandMagicSparkles,
      description: 'Rilievi appena entrati da qualificare.',
      accent: '#2563eb'
    },
    'to-review': {
      icon: faExclamationTriangle,
      description: 'Controllo tecnico e integrazioni prima dell’offerta.',
      accent: '#d97706'
    },
    quoting: {
      icon: faFileInvoice,
      description: 'Preventivazione economica e composizione proposta.',
      accent: '#7c3aed'
    },
    'waiting-supplier': {
      icon: faArchive,
      description: 'Attesa costi, disponibilita o conferme esterne.',
      accent: '#0891b2'
    },
    ready: {
      icon: faCheck,
      description: 'Offerta pronta per validazione e invio.',
      accent: '#059669'
    },
    sent: {
      icon: faPaperPlane,
      description: 'Proposta inviata e in follow-up commerciale.',
      accent: '#4f46e5'
    },
    accepted: {
      icon: faTrophy,
      description: 'Pratica accettata e chiusa positivamente.',
      accent: '#16a34a'
    }
  };

  assigneeOptions = computed(() => [...new Set(this.pipeline.quotes.quotes()
    .map((quote) => quote.assignee || quote.technicianName)
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right)));

  filteredItems = computed<CommercialQuoteListItem[]>(() => {
    const query = this.query().trim().toLowerCase();
    const priority = this.priority();
    const assignee = this.assignee();
    const stage = this.stageFilter();

    return this.pipeline.quotes.quotes().filter((quote) => {
      const currentStage = this.pipeline.statusFor(quote);
      const searchable = [
        quote.customer,
        quote.plantCode,
        quote.title,
        quote.assignee,
        quote.technicianName,
        quote.statusLabel,
        quote.inspectionStatus,
        quote.technicalValidation
      ].join(' ').toLowerCase();

      return (!query || searchable.includes(query))
        && (priority === 'all' || quote.priority === priority)
        && (assignee === 'all' || (quote.assignee || quote.technicianName) === assignee)
        && (stage === 'all' || currentStage === stage);
    });
  });

  filteredQuotes = this.filteredItems;

  flowSteps = computed<FlowStep[]>(() => this.pipeline.columns.map((column) => {
    const quotes = this.stageItems(column.status);
    const meta = this.metaFor(column.status);
    return {
      ...column,
      ...meta,
      quotes,
      totalValue: this.stageTotal(column.status),
      highPriority: quotes.filter((quote) => quote.priority === 'Alta').length
    };
  }));

  selectedStage = computed<FlowStep>(() => {
    const steps = this.flowSteps();
    const selected = this.selectedStageKey();
    const selectedStep = steps.find((step) => step.status === selected);
    if (selectedStep) {
      return selectedStep;
    }

    const nonEmpty = [...steps]
      .filter((step) => step.quotes.length)
      .sort((left, right) => right.quotes.length - left.quotes.length)[0];

    return nonEmpty ?? steps[0] ?? this.emptyStage();
  });

  selectedStatus = computed<PipelineStatus>(() => this.selectedStage().status);
  selectedStageItems = computed<CommercialQuoteListItem[]>(() => this.stageItems(this.selectedStage().status));
  selectedStep = this.selectedStage;
  selectedQuotes = this.selectedStageItems;
  totalValue = computed(() => this.filteredItems().reduce((sum, quote) => sum + this.quoteValue(quote), 0));
  openCount = computed(() => this.filteredItems().filter((quote) => this.pipeline.statusFor(quote) !== 'accepted').length);
  averageValue = computed(() => {
    const priced = this.filteredItems().filter((quote) => this.quoteValue(quote) > 0);
    return priced.length ? this.totalValue() / priced.length : 0;
  });
  hasFilters = computed(() => Boolean(this.query().trim()) || this.priority() !== 'all' || this.assignee() !== 'all' || this.stageFilter() !== 'all');

  constructor(public pipeline: PipelineCommercialeService, private router: Router) {}

  ngOnInit(): void {
    this.pipeline.load();
  }

  selectStage(stageKey: string): void {
    this.selectedStageKey.set(stageKey);
  }

  clearFilters(): void {
    this.query.set('');
    this.priority.set('all');
    this.assignee.set('all');
    this.stageFilter.set('all');
    this.selectedStageKey.set(this.firstAvailableStageKey());
  }

  setQuery(value: string): void {
    this.query.set(value);
    this.realignSelectedStage();
  }

  setPriority(value: string): void {
    this.priority.set(value);
    this.realignSelectedStage();
  }

  setAssignee(value: string): void {
    this.assignee.set(value);
    this.realignSelectedStage();
  }

  setStageFilter(value: PipelineStatus | 'all'): void {
    this.stageFilter.set(value);
    this.realignSelectedStage();
  }

  open(quote: CommercialQuoteListItem): void {
    if (quote.quoteId) {
      this.router.navigate(['/commerciale/preventivo', quote.quoteId]);
      return;
    }

    this.pipeline.quotes.ensureQuoteForInspection(quote.inspectionId).subscribe({
      next: (created) => this.router.navigate(['/commerciale/preventivo', created.id]),
      error: () => this.pipeline.quotes.error.set('Impossibile aprire o creare il preventivo per questo rilievo.')
    });
  }

  stageTitle(status: PipelineStatus | 'all'): string {
    if (status === 'all') {
      return 'Tutte le fasi';
    }
    return this.pipeline.columns.find((column) => column.status === status)?.title ?? status;
  }

  actionLabel(quote: CommercialQuoteListItem): string {
    return 'Apri';
  }

  stageItems(stageKey: string): CommercialQuoteListItem[] {
    const safeStageKey = stageKey || this.firstAvailableStageKey();
    return this.filteredItems().filter((quote) => this.pipeline.statusFor(quote) === safeStageKey);
  }

  stageTotal(stageKey: string): number {
    return this.stageItems(stageKey).reduce((sum, quote) => sum + this.quoteValue(quote), 0);
  }

  stageCount(stageKey: string): number {
    return this.stageItems(stageKey).length;
  }

  stageIcon(stageKey: string): IconDefinition {
    return this.metaFor(stageKey).icon;
  }

  trackByStage(index: number, stage: FlowStep): string {
    return stage.status || `stage-${index}`;
  }

  trackByPractice(index: number, quote: CommercialQuoteListItem): string {
    return quote.quoteId || quote.inspectionId || `${this.quoteCustomer(quote)}-${this.quotePlant(quote)}-${index}`;
  }

  trackByFilterOption(index: number, option: string): string {
    return option || `option-${index}`;
  }

  priorityTone(priority: string): 'success' | 'warning' | 'danger' | 'info' {
    if (priority === 'Alta') {
      return 'danger';
    }
    if (priority === 'Media') {
      return 'warning';
    }
    return 'info';
  }

  validationTone(quote: CommercialQuoteListItem): 'success' | 'warning' | 'danger' | 'info' {
    if (quote.technicalValidation === 'Validato') {
      return 'success';
    }
    if (quote.statusLabel === 'NEEDS_INTEGRATION' || quote.statusLabel === 'TO_REVIEW') {
      return 'danger';
    }
    return 'warning';
  }

  quoteCustomer(quote: CommercialQuoteListItem): string {
    return quote.customer?.trim() || 'Cliente non disponibile';
  }

  quotePlant(quote: CommercialQuoteListItem): string {
    return quote.plantCode?.trim() || 'Impianto non disponibile';
  }

  quoteStatus(quote: CommercialQuoteListItem): string {
    return quote.statusLabel?.trim() || 'Stato non definito';
  }

  quotePriority(quote: CommercialQuoteListItem): string {
    return quote.priority?.trim() || 'Priorità non definita';
  }

  quoteValue(quote: CommercialQuoteListItem | null | undefined): number {
    return this.toNumber(quote?.estimatedValue);
  }

  formatCurrency(value: unknown): string {
    const amount = this.toNumber(value);
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatQuoteValue(quote: CommercialQuoteListItem | null | undefined): string {
    return this.formatCurrency(this.quoteValue(quote));
  }

  quoteValidation(quote: CommercialQuoteListItem): string {
    return quote.technicalValidation?.trim() || 'Stato non definito';
  }

  quoteAssignee(quote: CommercialQuoteListItem): string {
    return quote.assignee?.trim() || quote.technicianName?.trim() || 'Non assegnato';
  }

  lastActivity(quote: CommercialQuoteListItem | null | undefined): string {
    return this.formatLastActivity(quote?.lastUpdated);
  }

  formatLastActivity(value: unknown): string {
    if (value instanceof Date && Number.isFinite(value.getTime())) {
      return this.formatDateParts(value);
    }

    if (typeof value !== 'string') {
      return 'Ultima attività non disponibile';
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return 'Ultima attività non disponibile';
    }

    const parsed = new Date(trimmed);
    if (!Number.isFinite(parsed.getTime())) {
      return trimmed;
    }

    return this.formatDateParts(parsed);
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const normalized = value
        .trim()
        .replace(/\s/g, '')
        .replace(/€/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private formatDateParts(date: Date): string {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private metaFor(status: PipelineStatus | string): StageMeta {
    return this.stageMeta[status as PipelineStatus] ?? {
      icon: this.icons.fallback,
      description: 'Fase pipeline commerciale.',
      accent: '#2563eb'
    };
  }

  private realignSelectedStage(): void {
    const selected = this.selectedStageKey();
    const currentStillAvailable = Boolean(selected && this.flowSteps().some((step) => step.status === selected));
    if (!currentStillAvailable || (this.stageFilter() !== 'all' && selected !== this.stageFilter())) {
      this.selectedStageKey.set(this.firstAvailableStageKey());
    }
  }

  private firstAvailableStageKey(): string {
    const withItems = this.flowSteps().find((step) => step.quotes.length);
    return withItems?.status ?? this.pipeline.columns[0]?.status ?? 'new-survey';
  }

  private emptyStage(): FlowStep {
    const fallback = this.metaFor('new-survey');
    return {
      status: 'new-survey',
      title: 'Pipeline',
      description: fallback.description,
      icon: fallback.icon,
      accent: fallback.accent,
      quotes: [],
      totalValue: 0,
      highPriority: 0
    };
  }
}
