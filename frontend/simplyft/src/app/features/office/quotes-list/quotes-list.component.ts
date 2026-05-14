import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuoteMockService } from '../../../core/services/quote-mock.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-quotes-list',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, StatusBadgeComponent],
  template: `
    <section class="office-page">
      <div class="section-head"><h2>Preventivi</h2><a class="btn primary" routerLink="/office/pipeline">Pipeline</a></div>
      <div class="quote-list">
        <a class="quote-row card" *ngFor="let quote of quotes.quotes()" [routerLink]="['/office/preventivo', quote.id]">
          <div><b>{{ quote.title }}</b><p>{{ quote.customer }} - {{ quote.plantCode }}</p></div>
          <app-status-badge [label]="quote.technicalValidation" [tone]="quote.technicalValidation === 'Validato' ? 'success' : 'warning'" />
          <strong>{{ quote.estimatedValue | currency:'EUR':'symbol':'1.0-0' }}</strong>
          <span>{{ quote.assignee }}</span>
        </a>
      </div>
    </section>
  `
})
export class QuotesListComponent {
  constructor(public quotes: QuoteMockService) {}
}
