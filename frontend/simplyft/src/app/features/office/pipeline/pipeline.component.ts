import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommercialQuoteListItem, PipelineStatus } from '../../../core/models/simplyft.models';
import { PipelineCommercialeService } from '../../../core/services/pipeline-commerciale.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  templateUrl: './pipeline.component.html',
  styleUrl: './pipeline.component.css'
})
export class PipelineComponent implements OnInit {
  query = signal('');
  priority = signal('all');
  assignee = signal('all');

  assigneeOptions = computed(() => [...new Set(this.pipeline.quotes.quotes()
    .map((quote) => quote.assignee || quote.technicianName)
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right)));

  filteredQuotes = computed(() => {
    const query = this.query().trim().toLowerCase();
    const priority = this.priority();
    const assignee = this.assignee();

    return this.pipeline.quotes.quotes().filter((quote) => {
      const matchesQuery = !query || [
        quote.title,
        quote.customer,
        quote.plantCode,
        quote.assignee,
        quote.technicianName,
        quote.statusLabel,
        quote.inspectionStatus
      ].join(' ').toLowerCase().includes(query);
      const matchesPriority = priority === 'all' || quote.priority === priority;
      const currentAssignee = quote.assignee || quote.technicianName;
      const matchesAssignee = assignee === 'all' || currentAssignee === assignee;
      return matchesQuery && matchesPriority && matchesAssignee;
    });
  });

  grouped = computed(() => this.pipeline.columns.map((column) => {
    const quotes = this.filteredQuotes().filter((quote) => this.pipeline.statusFor(quote) === column.status);
    return {
      ...column,
      quotes,
      totalValue: quotes.reduce((sum, quote) => sum + Number(quote.estimatedValue ?? 0), 0)
    };
  }));

  totalValue = computed(() => this.filteredQuotes().reduce((sum, quote) => sum + Number(quote.estimatedValue ?? 0), 0));
  openCount = computed(() => this.filteredQuotes().filter((quote) => this.pipeline.statusFor(quote) !== 'accepted').length);

  constructor(public pipeline: PipelineCommercialeService, private router: Router) {}

  ngOnInit(): void {
    this.pipeline.load();
  }

  clearFilters(): void {
    this.query.set('');
    this.priority.set('all');
    this.assignee.set('all');
  }

  open(quote: CommercialQuoteListItem): void {
    if (quote.quoteId) {
      this.router.navigate(['/commerciale/preventivo', quote.quoteId]);
      return;
    }

    this.pipeline.quotes.ensureQuoteForInspection(quote.inspectionId).subscribe({
      next: (created) => this.router.navigate(['/commerciale/preventivo', created.id]),
      error: () => this.pipeline.quotes.error.set('Impossibile aprire o creare il preventivo per questo rilievo.')
    });
  }

  statusTitle(status: PipelineStatus): string {
    return this.pipeline.columns.find((column) => column.status === status)?.title ?? status;
  }

  validationTone(quote: CommercialQuoteListItem): 'success' | 'warning' | 'danger' | 'info' {
    if (quote.technicalValidation === 'Validato') {
      return 'success';
    }
    if (quote.statusLabel === 'NEEDS_INTEGRATION') {
      return 'danger';
    }
    return 'warning';
  }
}
