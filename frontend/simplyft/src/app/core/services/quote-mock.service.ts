import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { ActivityLog, ComponentSuggestion, PipelineStatus, Quote, QuoteItem } from '../models/simplyft.models';

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

interface ApiQuoteRow {
  id: string;
  description: string;
  quantity: number;
  materialUnitPrice: number;
}

@Injectable({ providedIn: 'root' })
export class QuoteMockService {
  quotes = signal<Quote[]>([]);

  constructor(private http: HttpClient) {
    this.load();
  }

  load(): void {
    this.http.get<ApiQuote[]>('/api/quotes').subscribe({
      next: (quotes) => this.quotes.set(quotes.map((quote) => this.toQuote(quote))),
      error: () => this.quotes.set([])
    });
  }

  getById(id: string): Quote | undefined {
    const quote = this.quotes().find((item) => item.id === id);
    if (quote && !quote.items.length) {
      const numericId = id.replace('q-', '');
      this.http.get<ApiQuoteRow[]>(`/api/quotes/${numericId}/rows`).subscribe((rows) => {
        const items = rows.map((row) => ({
          id: String(row.id),
          description: row.description,
          quantity: Number(row.quantity ?? 1),
          unitCost: Number(row.materialUnitPrice ?? 0),
          margin: 20
        }));
        this.quotes.update((quotes) => quotes.map((item) => item.id === id ? { ...item, items } : item));
      });
    }
    return quote;
  }

  totals(quote: Quote): { cost: number; marginAmount: number; finalPrice: number } {
    const cost = quote.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const marginAmount = quote.items.reduce((sum, item) => sum + item.quantity * item.unitCost * item.margin / 100, 0);
    return { cost, marginAmount, finalPrice: cost + marginAmount };
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
