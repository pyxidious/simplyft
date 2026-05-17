import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerPlant } from '../../../../core/models/simplyft.models';
import { InspectionService } from '../../../../core/services/inspection.service';

@Component({
  selector: 'app-customer-plant-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="survey-panel selection-panel">
      <div class="panel-title-row">
        <div>
          <p class="eyebrow">Cliente / impianto</p>
          <h2>Seleziona il contesto del rilievo</h2>
        </div>
        <span class="status-badge success" *ngIf="selected">Selezionato</span>
      </div>

      <label class="search-field compact-search">
        <input
          [(ngModel)]="query"
          (ngModelChange)="search()"
          placeholder="Cerca per nome, matricola o impianto..."
          aria-label="Cerca cliente, matricola o impianto"
        />
        <span>⌕</span>
      </label>

      <button class="selected-plant selected-plant-clear" type="button" *ngIf="selected">
        <span class="plant-icon">▦</span>
        <span>
          <strong>{{ selected.customerName }}</strong>
          <small>{{ selected.plantCode || 'Codice non disponibile' }} · {{ selected.address || selected.type || 'Dettaglio impianto non disponibile' }}</small>
        </span>
      </button>

      <div class="result-list" *ngIf="query.trim() && results().length">
        <button type="button" *ngFor="let customer of results()" (click)="choose(customer)">
          <span>
            <strong>{{ customer.customerName }}</strong>
            <small>{{ customer.plantCode || customer.serial }} · {{ customer.address }}</small>
          </span>
          <b>Seleziona</b>
        </button>
      </div>

      <p class="empty-state" *ngIf="query.trim() && !loading() && !results().length">Nessun impianto trovato.</p>
      <p class="muted loading-line" *ngIf="loading()">Ricerca in corso...</p>
    </section>
  `
})
export class CustomerPlantSelectorComponent implements OnInit {
  @Input() selected?: CustomerPlant;
  @Output() selectedChange = new EventEmitter<CustomerPlant>();

  query = '';
  loading = signal(false);
  results = signal<CustomerPlant[]>([]);

  constructor(private inspections: InspectionService) {}

  ngOnInit(): void {
    this.search();
  }

  search(): void {
    this.loading.set(true);
    this.inspections.searchCustomers(this.query).subscribe({
      next: (items) => {
        this.results.set(items.slice(0, 5));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  choose(customer: CustomerPlant): void {
    this.selected = customer;
    this.query = '';
    this.results.set([]);
    this.selectedChange.emit(customer);
  }
}
