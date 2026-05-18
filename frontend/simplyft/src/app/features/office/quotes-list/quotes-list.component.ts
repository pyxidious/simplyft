import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommercialQuoteListItem } from '../../../core/models/simplyft.models';
import { PreventiviCommercialeService } from '../../../core/services/preventivi-commerciale.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-quotes-list',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule, RouterLink, StatusBadgeComponent],
  templateUrl: './quotes-list.component.html',
  styleUrl: './quotes-list.component.css'
})
export class QuotesListComponent implements OnInit {
  constructor(public quotes: PreventiviCommercialeService, private router: Router) {}

  ngOnInit(): void {
    this.quotes.load();
    this.quotes.loadTechnicians();
  }

  open(quote: CommercialQuoteListItem): void {
    if (quote.quoteId) {
      this.router.navigate(['/commerciale/preventivo', quote.quoteId]);
      return;
    }
    this.quotes.ensureQuoteForInspection(quote.inspectionId).subscribe({
      next: (created) => this.router.navigate(['/commerciale/preventivo', created.id]),
      error: () => this.quotes.error.set('Impossibile aprire o creare il preventivo per questo rilievo.')
    });
  }

  updateTechnician(quote: CommercialQuoteListItem, technicianId: string): void {
    if (!technicianId || technicianId === quote.technicianId) {
      return;
    }
    this.quotes.updateInspectionTechnician(quote.inspectionId, technicianId).subscribe({
      error: () => this.quotes.error.set('Modifica tecnico non riuscita.')
    });
  }
}
