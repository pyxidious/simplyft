import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  styleUrl: './kpi-card.component.css',
  template: `
    <article class="card kpi-card">
      <div>
        <p class="muted">{{ label }}</p>
        <h2>{{ value }}</h2>
      </div>
      <span class="metric-chip" [class.up]="trendTone === 'up'" [class.warn]="trendTone === 'warn'">{{ trend }}</span>
    </article>
  `
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() trend = '';
  @Input() trendTone: 'up' | 'warn' | 'flat' = 'flat';
}
