import { Injectable, signal } from '@angular/core';
import { Quote } from '../models/simplyft.models';
import { MOCK_QUOTES } from './mock-data';

@Injectable({ providedIn: 'root' })
export class QuoteMockService {
  quotes = signal<Quote[]>(this.restore());

  getById(id: string): Quote | undefined {
    return this.quotes().find((quote) => quote.id === id);
  }

  totals(quote: Quote): { cost: number; marginAmount: number; finalPrice: number } {
    const cost = quote.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const marginAmount = quote.items.reduce((sum, item) => sum + item.quantity * item.unitCost * item.margin / 100, 0);
    return { cost, marginAmount, finalPrice: cost + marginAmount };
  }

  private restore(): Quote[] {
    const raw = localStorage.getItem('simplyft-quotes');
    return raw ? JSON.parse(raw) as Quote[] : MOCK_QUOTES;
  }
}
