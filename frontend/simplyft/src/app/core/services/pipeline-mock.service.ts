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
    const seed = this.extraCards();
    const all = [...this.quotes.quotes(), ...seed];
    return this.columns.map((column) => ({
      ...column,
      quotes: all.filter((quote) => quote.status === column.status)
    }));
  }

  private extraCards(): Quote[] {
    return [
      { ...this.quotes.quotes()[0], id: 'q-9003', customer: 'Hotel San Marco', plantCode: 'VR-HSM-01', status: 'new-survey', priority: 'Alta', estimatedValue: 22100, lastUpdated: '13/05/2026 14:05' },
      { ...this.quotes.quotes()[0], id: 'q-9004', customer: 'Farmacia Duomo', plantCode: 'MI-FDU-04', status: 'waiting-supplier', priority: 'Bassa', estimatedValue: 6400, lastUpdated: '10/05/2026 12:20' },
      { ...this.quotes.quotes()[0], id: 'q-9005', customer: 'Centro Logistico Est', plantCode: 'PD-CLE-09', status: 'ready', priority: 'Media', estimatedValue: 31500, lastUpdated: '13/05/2026 08:44' },
      { ...this.quotes.quotes()[0], id: 'q-9006', customer: 'Residence Garda', plantCode: 'BS-RGA-03', status: 'sent', priority: 'Media', estimatedValue: 12800, lastUpdated: '09/05/2026 18:02' },
      { ...this.quotes.quotes()[0], id: 'q-9007', customer: 'Clinica Nova', plantCode: 'MI-CNO-11', status: 'accepted', priority: 'Alta', estimatedValue: 44600, lastUpdated: '08/05/2026 09:32' }
    ];
  }
}
