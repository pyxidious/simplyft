import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommercialCustomer, CommercialPlantOption, CommercialQuoteDetail, QuoteDocument } from '../../../core/models/simplyft.models';
import { AssegnazioniCommercialeService } from '../../../core/services/assegnazioni-commerciale.service';
import { PreventiviCommercialeService } from '../../../core/services/preventivi-commerciale.service';
import { ActivityTimelineComponent } from '../../../shared/components/activity-timeline/activity-timeline.component';
import { QuoteSummaryComponent } from '../../../shared/components/quote-summary/quote-summary.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule, RouterLink, StatusBadgeComponent, QuoteSummaryComponent, ActivityTimelineComponent],
  templateUrl: './quote-detail.component.html',
  styleUrl: './quote-detail.component.css'
})
export class QuoteDetailComponent implements OnInit {
  quote = signal<CommercialQuoteDetail | undefined>(undefined);
  document = signal<QuoteDocument | undefined>(undefined);
  activeTab = signal<'survey' | 'registry' | 'document'>('survey');
  totals = { cost: 0, marginAmount: 0, finalPrice: 0 };
  loading = signal(false);
  error = signal('');
  feedback = signal('');
  integrationOpen = signal(false);
  confirmOpen = signal(false);
  integrationReason = '';
  integrationNotes = '';
  integrationFields = '';
  customerDraft: CommercialQuoteDetail['customerDetail'] | undefined;
  plantDraft: CommercialQuoteDetail['plant'] | undefined;
  newCustomer: Partial<CommercialCustomer> & { phone?: string } = { name: '', city: '', email: '', phone: '' };
  newPlant: Partial<CommercialPlantOption> & { serial?: string; city?: string } = { customerId: '', address: '', type: '', serial: '', city: '' };
  readonly documentTemplates = ['Modello Preventivo Standard', 'Modernizzazione impianto', 'Manutenzione straordinaria'];

  constructor(
    private route: ActivatedRoute,
    public quotes: PreventiviCommercialeService,
    public registry: AssegnazioniCommercialeService
  ) {}

  ngOnInit(): void {
    this.load();
    this.registry.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Preventivo non valido.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.quotes.getById(id).subscribe({
      next: (quote) => {
        this.quote.set(quote);
        this.customerDraft = { ...quote.customerDetail };
        this.plantDraft = { ...quote.plant };
        this.totals = this.quotes.totals(quote);
        this.loading.set(false);
        this.loadDocument(quote.id);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Nessun dato disponibile');
      }
    });
  }

  loadDocument(id: string): void {
    this.quotes.getDocument(id).subscribe({
      next: (document) => this.document.set({
        ...document,
        template: document.template || 'Modello Preventivo Standard',
        customClauses: document.customClauses ?? []
      }),
      error: () => this.error.set('Documento preventivo non disponibile.')
    });
  }

  editable(): boolean {
    return this.quote()?.statusLabel !== 'CONFIRMED';
  }

  saveCustomer(): void {
    const item = this.quote();
    if (!item || !this.customerDraft || !this.editable()) {
      return;
    }
    this.quotes.updateCustomer(item.id, this.customerDraft).subscribe({
      next: (quote) => {
        this.quote.set(quote);
        this.customerDraft = { ...quote.customerDetail };
        this.feedback.set('Anagrafica cliente salvata.');
      },
      error: () => this.error.set('Salvataggio anagrafica non riuscito.')
    });
  }

  savePlant(): void {
    const item = this.quote();
    if (!item || !this.plantDraft || !this.editable()) {
      return;
    }
    this.quotes.updatePlant(item.id, this.plantDraft).subscribe({
      next: (quote) => {
        this.quote.set(quote);
        this.plantDraft = { ...quote.plant };
        this.feedback.set('Dati impianto salvati.');
      },
      error: () => this.error.set('Salvataggio impianto non riuscito.')
    });
  }

  saveDocument(): void {
    const item = this.quote();
    const document = this.document();
    if (!item || !document || !this.editable()) {
      return;
    }
    this.quotes.saveDocument(item.id, document).subscribe({
      next: (saved) => {
        this.document.set(saved);
        this.feedback.set('Documento preventivo salvato.');
      },
      error: () => this.error.set('Salvataggio documento non riuscito.')
    });
  }

  applyTemplate(template: string): void {
    const doc = this.document();
    if (!doc || !this.editable()) {
      return;
    }
    doc.template = template;
    if (template === 'Modernizzazione impianto') {
      doc.includes = 'Fornitura componenti, manodopera specializzata, configurazione e collaudo funzionale.';
      doc.excludes = 'Opere murarie, pratiche comunali, alimentazioni elettriche non presenti e lavorazioni non descritte.';
    } else if (template === 'Manutenzione straordinaria') {
      doc.includes = 'Intervento tecnico, materiali indicati e verifica finale di funzionamento.';
      doc.excludes = 'Componenti non rilevati, urgenze fuori orario e attivita non presenti in offerta.';
    }
    this.document.set({ ...doc });
  }

  addClause(): void {
    const doc = this.document();
    if (!doc || !this.editable()) {
      return;
    }
    this.document.set({
      ...doc,
      customClauses: [...(doc.customClauses ?? []), { title: 'Nuova clausola', text: '' }]
    });
  }

  removeClause(index: number): void {
    const doc = this.document();
    if (!doc || !this.editable()) {
      return;
    }
    this.document.set({
      ...doc,
      customClauses: doc.customClauses.filter((_item, itemIndex) => itemIndex !== index)
    });
  }

  createCustomer(): void {
    if (!this.newCustomer.name?.trim()) {
      this.error.set('Nome cliente obbligatorio.');
      return;
    }
    this.registry.createCustomer(this.newCustomer);
    this.newCustomer = { name: '', city: '', email: '', phone: '' };
  }

  updateRegistryCustomer(customer: CommercialCustomer): void {
    this.registry.updateCustomer(customer.id, customer);
  }

  createPlant(): void {
    if (!this.newPlant.customerId) {
      this.error.set('Seleziona un cliente per il nuovo impianto.');
      return;
    }
    this.registry.createPlant(this.newPlant);
    this.newPlant = { customerId: '', address: '', type: '', serial: '', city: '' };
  }

  updateRegistryPlant(plant: CommercialPlantOption): void {
    this.registry.updatePlant(plant.id, plant);
  }

  submitIntegration(): void {
    const item = this.quote();
    if (!item || !this.editable() || !this.integrationReason.trim()) {
      this.error.set('Motivo richiesta obbligatorio.');
      return;
    }
    this.error.set('');
    this.quotes.requestIntegration(item.id, {
      reason: this.integrationReason.trim(),
      notes: this.integrationNotes.trim(),
      fields: this.integrationFields.trim()
    }).subscribe({
      next: () => {
        this.integrationOpen.set(false);
        this.feedback.set('Richiesta integrazione inviata al tecnico.');
        this.integrationReason = '';
        this.integrationNotes = '';
        this.integrationFields = '';
        this.load();
      },
      error: () => this.error.set('Richiesta integrazione non riuscita.')
    });
  }

  confirmQuote(): void {
    const item = this.quote();
    if (!item) {
      return;
    }
    this.quotes.confirm(item.id).subscribe({
      next: (quote) => {
        this.confirmOpen.set(false);
        this.quote.set(quote);
        this.totals = this.quotes.totals(quote);
        this.feedback.set('Preventivo approvato.');
      },
      error: () => this.error.set('Approvazione preventivo non riuscita.')
    });
  }

  generatePdf(): void {
    const item = this.quote();
    if (!item) {
      return;
    }
    this.quotes.downloadPdf(item.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${item.id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('Generazione PDF non riuscita.')
    });
  }
}
