import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerPlant } from '../../../../core/models/simplyft.models';
import { InspectionService } from '../../../../core/services/inspection.service';

@Component({
  selector: 'app-customer-plant-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-plant-selector.component.html',
  styleUrl: './customer-plant-selector.component.css'
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
