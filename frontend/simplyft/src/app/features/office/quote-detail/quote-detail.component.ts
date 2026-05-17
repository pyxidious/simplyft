import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Quote } from '../../../core/models/simplyft.models';
import { QuoteMockService } from '../../../core/services/quote-mock.service';
import { ActivityTimelineComponent } from '../../../shared/components/activity-timeline/activity-timeline.component';
import { QuoteSummaryComponent } from '../../../shared/components/quote-summary/quote-summary.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, StatusBadgeComponent, QuoteSummaryComponent, ActivityTimelineComponent],
  template: `
    <section class="office-page" *ngIf="quote as item">
      <header class="detail-header">
        <div>
          <p class="muted">Preventivo {{ item.id }}</p>
          <h2>{{ item.title }}</h2>
          <span>{{ item.customer }} - impianto {{ item.plantCode }}</span>
        </div>
        <div class="button-row">
          <button class="btn primary">Approva</button>
          <button class="btn secondary">Richiedi integrazione</button>
          <button class="btn ghost">Genera PDF</button>
          <button class="btn ghost">Invia al cliente</button>
        </div>
      </header>

      <div class="quote-detail-grid">
        <section class="card wide-card">
          <h2>Rilievo normalizzato dal tecnico</h2>
          <div class="info-grid">
            <p><span>Cliente</span><b>{{ item.customer }}</b></p>
            <p><span>Codice impianto</span><b>{{ item.plantCode }}</b></p>
            <p><span>Validazione tecnica</span><b>{{ item.technicalValidation }}</b></p>
            <p><span>Priorita</span><b>{{ item.priority }}</b></p>
          </div>
          <div class="attachment-grid">
            <article class="attachment-tile"><div class="photo-thumb"></div><span>Quadro elettrico.jpg</span><small>Validata</small></article>
            <article class="attachment-tile"><div class="photo-thumb"></div><span>Vano corsa.jpg</span><small>Validata</small></article>
            <article class="attachment-tile"><div class="photo-thumb"></div><span>Targhetta motore.jpg</span><small>Mancante</small></article>
          </div>
        </section>
        <app-quote-summary [cost]="totals.cost" [margin]="totals.marginAmount" [finalPrice]="totals.finalPrice" />
        <section class="card wide-card">
          <h2>Componenti suggeriti</h2>
          <div class="component-row" *ngFor="let component of item.components">
            <div><b>{{ component.name }}</b><p>{{ component.sku }} - {{ component.supplier }}</p></div>
            <app-status-badge [label]="component.confidence + '% compatibile'" tone="success" />
          </div>
        </section>
        <section class="card">
          <h2>Costi e margini</h2>
          <div class="cost-row" *ngFor="let line of item.items">
            <span>{{ line.description }}</span>
            <b>{{ line.quantity * line.unitCost | currency:'EUR' }}</b>
            <small>{{ line.margin }}% margine</small>
          </div>
        </section>
        <section class="card">
          <h2>Commenti interni</h2>
          <p class="note-row" *ngFor="let comment of item.internalComments">{{ comment }}</p>
        </section>
        <section class="card wide-card">
          <h2>Storico attivita</h2>
          <app-activity-timeline [items]="item.activities" />
        </section>
      </div>
    </section>
  `
})
export class QuoteDetailComponent {
  quote: Quote | undefined;
  totals = { cost: 0, marginAmount: 0, finalPrice: 0 };

  constructor(private route: ActivatedRoute, private quotes: QuoteMockService) {
    this.quote = this.quotes.getById(this.route.snapshot.paramMap.get('id') ?? 'q-9001');
    this.totals = this.quote ? this.quotes.totals(this.quote) : this.totals;
  }
}
