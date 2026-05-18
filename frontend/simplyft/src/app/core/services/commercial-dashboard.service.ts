import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { catchError, finalize, map, of } from 'rxjs';
import {
  ActivityLog,
  CommercialDashboard,
  ComponentSuggestion,
  PipelineStatus,
  Quote,
  QuoteItem
} from '../models/simplyft.models';

interface ApiCommercialDashboard {
  kpis: CommercialDashboard['kpis'];
  recentInspections: CommercialDashboard['recentInspections'];
  recentQuotes: ApiQuote[];
  recentCustomers: CommercialDashboard['recentCustomers'];
  opportunityTrend: CommercialDashboard['opportunityTrend'];
}

interface ApiQuote {
  id: string;
  sheetNumber: string;
  customer: string;
  plantCode: string;
  status: string;
  priority: 'Alta' | 'Media' | 'Bassa';
  assignee: string;
  technicalValidation: 'Validato' | 'Da verificare' | 'In attesa integrazione';
  estimatedValue: number;
  lastUpdated: string;
}

@Injectable({ providedIn: 'root' })
export class CommercialDashboardService {
  private readonly dashboardState = signal<CommercialDashboard | undefined>(undefined);
  readonly dashboard = computed(() => this.dashboardState());
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(private http: HttpClient) {}

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.http.get<ApiCommercialDashboard>('/api/commerciale/dashboard').pipe(
      map((dashboard) => ({
        ...dashboard,
        recentQuotes: dashboard.recentQuotes.map((quote) => this.toQuote(quote))
      })),
      catchError(() => {
        this.error.set('Impossibile caricare i dati della dashboard.');
        this.dashboardState.set(undefined);
        return of(undefined);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((dashboard) => {
      if (dashboard) {
        this.dashboardState.set(dashboard);
      }
    });
  }

  private toQuote(quote: ApiQuote): Quote {
    return {
      id: quote.id,
      surveyId: quote.id,
      customer: quote.customer,
      plantCode: quote.plantCode,
      title: quote.sheetNumber ? `Preventivo ${quote.sheetNumber}` : `Preventivo ${quote.id}`,
      status: this.toStatus(quote.status),
      priority: quote.priority,
      assignee: quote.assignee,
      lastUpdated: quote.lastUpdated,
      estimatedValue: Number(quote.estimatedValue ?? 0),
      technicalValidation: quote.technicalValidation,
      components: [] as ComponentSuggestion[],
      items: [] as QuoteItem[],
      activities: [{ id: `${quote.id}-activity`, actor: quote.assignee, action: 'Aggiornato da backend', date: quote.lastUpdated, tone: 'info' }] as ActivityLog[],
      internalComments: []
    };
  }

  private toStatus(status: string): PipelineStatus {
    const normalized = status.toLowerCase().replaceAll('_', '-');
    const allowed: PipelineStatus[] = ['new-survey', 'to-review', 'quoting', 'waiting-supplier', 'ready', 'sent', 'accepted'];
    return allowed.includes(normalized as PipelineStatus) ? normalized as PipelineStatus : 'to-review';
  }
}
