import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PipelineStatus, Quote } from '../../../core/models/simplyft.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, StatusBadgeComponent],
  template: `
    <div class="kanban">
      <section class="kanban-column" *ngFor="let column of columns">
        <header><h3>{{ column.title }}</h3><span>{{ column.quotes.length }}</span></header>
        <a class="kanban-card" *ngFor="let quote of column.quotes" [routerLink]="['/office/preventivo', quote.id]">
          <div class="kanban-card-top">
            <b>{{ quote.customer }}</b>
            <app-status-badge [label]="quote.priority" [tone]="quote.priority === 'Alta' ? 'danger' : quote.priority === 'Media' ? 'warning' : 'info'" />
          </div>
          <p>{{ quote.plantCode }}</p>
          <strong>{{ quote.estimatedValue | currency:'EUR':'symbol':'1.0-0' }}</strong>
          <small>{{ quote.assignee }} · {{ quote.lastUpdated }}</small>
        </a>
      </section>
    </div>
  `
})
export class KanbanBoardComponent {
  @Input() columns: { status: PipelineStatus; title: string; quotes: Quote[] }[] = [];
}
