import { Injectable, computed } from '@angular/core';
import { CommercialQuoteListItem, PipelineStatus } from '../models/simplyft.models';
import { PreventiviCommercialeService } from './preventivi-commerciale.service';

@Injectable({ providedIn: 'root' })
export class PipelineCommercialeService {
  readonly columns: { status: PipelineStatus; title: string }[] = [
    { status: 'new-survey', title: 'Nuovo rilievo' },
    { status: 'to-review', title: 'Da verificare' },
    { status: 'quoting', title: 'In preventivazione' },
    { status: 'waiting-supplier', title: 'In attesa fornitore' },
    { status: 'ready', title: 'Pronto per invio' },
    { status: 'sent', title: 'Inviato' },
    { status: 'accepted', title: 'Accettato' }
  ];

  readonly grouped = computed(() => {
    const items = this.quotes.quotes();
    return this.columns.map((column) => ({
      ...column,
      quotes: items.filter((quote) => this.pipelineStatus(quote) === column.status)
    }));
  });

  constructor(public quotes: PreventiviCommercialeService) {}

  load(): void {
    this.quotes.load();
  }

  private pipelineStatus(item: CommercialQuoteListItem): PipelineStatus {
    if (!item.hasQuote) {
      return 'to-review';
    }
    if (item.statusLabel === 'CONFIRMED') {
      return 'accepted';
    }
    if (item.statusLabel === 'NEEDS_INTEGRATION' || item.statusLabel === 'TO_REVIEW') {
      return 'to-review';
    }
    return 'quoting';
  }
}
