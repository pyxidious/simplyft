import { Injectable } from '@angular/core';
import { PipelineStatus, Quote } from '../models/simplyft.models';
import { QuoteMockService } from './quote-mock.service';

@Injectable({ providedIn: 'root' })
export class PipelineMockService {
  readonly columns: { status: PipelineStatus; title: string }[] = [
    { status: 'new-survey', title: 'Nuovo rilievo' },
    { status: 'to-review', title: 'Da verificare' },
    { status: 'quoting', title: 'In preventivazione' },
    { status: 'waiting-supplier', title: 'In attesa fornitore' },
    { status: 'ready', title: 'Pronto per invio' },
    { status: 'sent', title: 'Inviato' },
    { status: 'accepted', title: 'Accettato' }
  ];

  constructor(private quotes: QuoteMockService) {}

  grouped(): { status: PipelineStatus; title: string; quotes: Quote[] }[] {
    const all = this.quotes.quotes();
    return this.columns.map((column) => ({
      ...column,
      quotes: all.filter((quote) => quote.status === column.status)
    }));
  }

}
