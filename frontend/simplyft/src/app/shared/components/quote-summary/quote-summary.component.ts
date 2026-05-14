import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-quote-summary',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <aside class="card quote-summary">
      <p class="muted">Riepilogo economico</p>
      <div><span>Costi</span><b>{{ cost | currency:'EUR' }}</b></div>
      <div><span>Margine</span><b>{{ margin | currency:'EUR' }}</b></div>
      <div class="total"><span>Prezzo finale</span><b>{{ finalPrice | currency:'EUR' }}</b></div>
    </aside>
  `
})
export class QuoteSummaryComponent {
  @Input() cost = 0;
  @Input() margin = 0;
  @Input() finalPrice = 0;
}
