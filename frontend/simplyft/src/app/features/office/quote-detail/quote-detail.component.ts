import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Quote } from '../../../core/models/simplyft.models';
import { QuoteMockService } from '../../../core/services/quote-mock.service';
import { ActivityTimelineComponent } from '../../../shared/components/activity-timeline/activity-timeline.component';
import { QuoteSummaryComponent } from '../../../shared/components/quote-summary/quote-summary.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, StatusBadgeComponent, QuoteSummaryComponent, ActivityTimelineComponent],
  templateUrl: './quote-detail.component.html',
  styleUrl: './quote-detail.component.css'
})
export class QuoteDetailComponent {
  quote: Quote | undefined;
  totals = { cost: 0, marginAmount: 0, finalPrice: 0 };

  constructor(private route: ActivatedRoute, private quotes: QuoteMockService) {
    this.quote = this.quotes.getById(this.route.snapshot.paramMap.get('id') ?? 'q-9001');
    this.totals = this.quote ? this.quotes.totals(this.quote) : this.totals;
  }
}
