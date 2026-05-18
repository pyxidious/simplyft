import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuoteMockService } from '../../../core/services/quote-mock.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-quotes-list',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, StatusBadgeComponent],
  templateUrl: './quotes-list.component.html',
  styleUrl: './quotes-list.component.css'
})
export class QuotesListComponent {
  constructor(public quotes: QuoteMockService) {}
}
