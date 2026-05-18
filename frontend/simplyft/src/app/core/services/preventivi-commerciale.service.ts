import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap, throwError } from 'rxjs';
import {
  ActivityLog,
  CommercialQuoteDetail,
  CommercialQuoteListItem,
  CommercialQuoteRow,
  CommercialTechnician,
  ComponentSuggestion,
  CreateIntegrationRequest,
  IntegrationRequest,
  PipelineStatus,
  PreventivoStatus,
  QuoteDocument,
  QuoteItem,
  RilievoStatus
} from '../models/simplyft.models';

interface ApiQuote {
  id: string;
  quoteId?: string;
  inspectionId?: string;
  hasQuote?: boolean;
  inspectionStatus?: RilievoStatus;
  technicianId?: string;
  technicianName?: string;
  sheetNumber?: string;
  title?: string;
  customer: string;
  plantCode: string;
  status: PreventivoStatus | string;
  priority: 'Alta' | 'Media' | 'Bassa';
  assignee: string;
  technicalValidation: 'Validato' | 'Da verificare' | 'In attesa integrazione';
  estimatedValue?: number;
  lastUpdated: string;
}

interface UpdateInspectionTechnicianResponse {
  inspectionId: string;
  technicianId: string;
  technicianName: string;
}

interface ApiQuoteDetail extends ApiQuote {
  customerDetail: CommercialQuoteDetail['customerDetail'];
  plant: CommercialQuoteDetail['plant'];
  inspection?: CommercialQuoteDetail['inspection'];
  items: CommercialQuoteRow[];
  totals: CommercialQuoteDetail['totals'];
  internalComments: string[];
  activities: ActivityLog[];
}

@Injectable({ providedIn: 'root' })
export class PreventiviCommercialeService {
  private readonly quotesState = signal<CommercialQuoteListItem[]>([]);
  readonly technicians = signal<CommercialTechnician[]>([]);
  readonly quotes = computed(() => this.quotesState());
  readonly loading = signal(false);
  readonly error = signal('');
  readonly actionLoading = signal('');

  constructor(private http: HttpClient) {}

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.http.get<ApiQuote[]>('/api/commerciale/preventivi').pipe(
      map((quotes) => quotes.map((quote) => this.toListItem(quote))),
      catchError(() => {
        this.error.set('Impossibile caricare i preventivi.');
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((quotes) => this.quotesState.set(quotes));
  }

  loadTechnicians(): void {
    this.http.get<CommercialTechnician[]>('/api/commerciale/tecnici').pipe(
      catchError(() => {
        this.error.set('Impossibile caricare i tecnici.');
        return of([]);
      })
    ).subscribe((technicians) => this.technicians.set(technicians));
  }

  getById(id: string): Observable<CommercialQuoteDetail> {
    this.actionLoading.set('detail');
    this.error.set('');
    return this.http.get<ApiQuoteDetail>(`/api/commerciale/preventivi/${id}`).pipe(
      map((quote) => this.toDetail(quote)),
      finalize(() => this.actionLoading.set('')),
      catchError((error) => {
        this.error.set('Impossibile caricare il dettaglio preventivo.');
        return throwError(() => error);
      })
    );
  }

  ensureQuoteForInspection(inspectionId: string): Observable<{ id: string }> {
    this.actionLoading.set(inspectionId);
    return this.http.post<{ id: string }>(`/api/commerciale/rilievi/${inspectionId}/preventivo`, {}).pipe(
      finalize(() => this.actionLoading.set(''))
    );
  }

  updateInspectionTechnician(inspectionId: string, technicianId: string): Observable<UpdateInspectionTechnicianResponse> {
    this.actionLoading.set(`technician:${inspectionId}`);
    return this.http.patch<UpdateInspectionTechnicianResponse>(`/api/commerciale/rilievi/${inspectionId}/tecnico`, { technicianId }).pipe(
      tap((updated) => {
        this.quotesState.update((items) => items.map((item) => item.inspectionId === updated.inspectionId
          ? { ...item, technicianId: updated.technicianId, technicianName: updated.technicianName }
          : item));
      }),
      finalize(() => this.actionLoading.set(''))
    );
  }

  requestIntegration(id: string, payload: CreateIntegrationRequest): Observable<IntegrationRequest> {
    this.actionLoading.set('integration');
    return this.http.post<IntegrationRequest>(`/api/commerciale/preventivi/${id}/richiedi-integrazione`, payload).pipe(
      finalize(() => this.actionLoading.set(''))
    );
  }

  confirm(id: string): Observable<CommercialQuoteDetail> {
    this.actionLoading.set('confirm');
    return this.http.post<ApiQuoteDetail>(`/api/commerciale/preventivi/${id}/confirm`, {}).pipe(
      map((quote) => this.toDetail(quote)),
      tap((quote) => this.upsertListItem(quote)),
      finalize(() => this.actionLoading.set(''))
    );
  }

  downloadPdf(id: string): Observable<Blob> {
    this.actionLoading.set('pdf');
    return this.http.get(`/api/commerciale/preventivi/${id}/pdf`, { responseType: 'blob' }).pipe(
      finalize(() => this.actionLoading.set(''))
    );
  }

  updateCustomer(id: string, payload: CommercialQuoteDetail['customerDetail']): Observable<CommercialQuoteDetail> {
    this.actionLoading.set('customer');
    return this.http.patch<ApiQuoteDetail>(`/api/commerciale/preventivi/${id}/cliente`, payload).pipe(
      map((quote) => this.toDetail(quote)),
      finalize(() => this.actionLoading.set(''))
    );
  }

  updatePlant(id: string, payload: CommercialQuoteDetail['plant']): Observable<CommercialQuoteDetail> {
    this.actionLoading.set('plant');
    return this.http.patch<ApiQuoteDetail>(`/api/commerciale/preventivi/${id}/impianto`, payload).pipe(
      map((quote) => this.toDetail(quote)),
      finalize(() => this.actionLoading.set(''))
    );
  }

  getDocument(id: string): Observable<QuoteDocument> {
    return this.http.get<QuoteDocument>(`/api/commerciale/preventivi/${id}/documento`);
  }

  saveDocument(id: string, document: QuoteDocument): Observable<QuoteDocument> {
    this.actionLoading.set('document');
    return this.http.put<QuoteDocument>(`/api/commerciale/preventivi/${id}/documento`, document).pipe(
      finalize(() => this.actionLoading.set(''))
    );
  }

  totals(quote: CommercialQuoteDetail): { cost: number; marginAmount: number; finalPrice: number } {
    return {
      cost: Number(quote.totals.labor ?? 0) + Number(quote.totals.material ?? 0),
      marginAmount: Number(quote.totals.margin ?? 0),
      finalPrice: Number(quote.totals.finalPrice ?? quote.estimatedValue ?? 0)
    };
  }

  private upsertListItem(quote: CommercialQuoteDetail): void {
    const listItem = this.toListItem(quote);
    this.quotesState.update((items) => items.some((item) => item.id === quote.id)
      ? items.map((item) => item.id === quote.id ? listItem : item)
      : [listItem, ...items]);
  }

  private toListItem(quote: ApiQuote): CommercialQuoteListItem {
    const statusLabel = this.toPreventivoStatus(quote.status);
    return {
      id: quote.id,
      surveyId: quote.id,
      quoteId: quote.quoteId ?? (quote.id.startsWith('q-') ? quote.id : undefined),
      inspectionId: quote.inspectionId ?? quote.id,
      hasQuote: Boolean(quote.hasQuote ?? quote.id.startsWith('q-')),
      inspectionStatus: quote.inspectionStatus ?? 'SUBMITTED',
      technicianId: quote.technicianId ?? '',
      technicianName: quote.technicianName ?? quote.assignee,
      customer: quote.customer,
      plantCode: quote.plantCode,
      title: quote.title ?? (quote.sheetNumber ? `Preventivo ${quote.sheetNumber}` : `Preventivo ${quote.id}`),
      status: this.toPipelineStatus(statusLabel),
      statusLabel,
      priority: quote.priority,
      assignee: quote.assignee,
      lastUpdated: quote.lastUpdated,
      estimatedValue: quote.estimatedValue == null ? 0 : Number(quote.estimatedValue),
      technicalValidation: quote.technicalValidation,
      components: [] as ComponentSuggestion[],
      items: [] as QuoteItem[],
      activities: [] as ActivityLog[],
      internalComments: []
    };
  }

  private toDetail(quote: ApiQuoteDetail): CommercialQuoteDetail {
    const base = this.toListItem(quote);
    const rows = (quote.items ?? []).map((row) => ({
      ...row,
      quantity: Number(row.quantity ?? 0),
      laborHours: Number(row.laborHours ?? 0),
      laborTotal: Number(row.laborTotal ?? 0),
      materialUnitPrice: Number(row.materialUnitPrice ?? 0),
      materialTotal: Number(row.materialTotal ?? 0),
      margin: Number(row.margin ?? 0)
    }));
    return {
      ...base,
      sheetNumber: quote.sheetNumber ?? quote.id,
      customerDetail: quote.customerDetail,
      plant: quote.plant,
      inspection: quote.inspection,
      rows,
      totals: {
        labor: Number(quote.totals?.labor ?? 0),
        material: Number(quote.totals?.material ?? 0),
        margin: Number(quote.totals?.margin ?? 0),
        finalPrice: Number(quote.totals?.finalPrice ?? quote.estimatedValue ?? 0)
      },
      components: [],
      items: rows.map((row) => ({
        id: row.id,
        description: row.description,
        quantity: row.quantity,
        unitCost: row.materialUnitPrice,
        margin: row.margin
      })),
      activities: quote.activities ?? [],
      internalComments: quote.internalComments ?? []
    };
  }

  private toPreventivoStatus(status: string): PreventivoStatus {
    const normalized = String(status ?? 'DRAFT').toUpperCase();
    if (['DRAFT', 'TO_REVIEW', 'QUOTING', 'CONFIRMED', 'NEEDS_INTEGRATION'].includes(normalized)) {
      return normalized as PreventivoStatus;
    }
    return 'DRAFT';
  }

  private toPipelineStatus(status: PreventivoStatus): PipelineStatus {
    if (status === 'CONFIRMED') {
      return 'accepted';
    }
    if (status === 'NEEDS_INTEGRATION') {
      return 'to-review';
    }
    if (status === 'TO_REVIEW') {
      return 'to-review';
    }
    if (status === 'QUOTING' || status === 'DRAFT') {
      return 'quoting';
    }
    return 'new-survey';
  }
}
