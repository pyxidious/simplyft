import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssegnazioniCommercialeService } from '../../../core/services/assegnazioni-commerciale.service';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assignments.component.html',
  styleUrl: './assignments.component.css'
})
export class AssignmentsComponent implements OnInit {
  newCustomer = {
    name: '',
    city: '',
    email: '',
    phone: ''
  };

  newPlant = {
    customerId: '',
    serial: '',
    address: '',
    city: '',
    type: ''
  };

  form = {
    technicianId: '',
    customerId: '',
    plantId: '',
    title: '',
    description: '',
    priority: 'Media',
    dueDate: '',
    status: 'assegnata'
  };

  constructor(public assignments: AssegnazioniCommercialeService) {}

  ngOnInit(): void {
    this.assignments.load();
  }

  customerChanged(customerId: string): void {
    this.form.customerId = customerId;
    this.form.plantId = '';
    this.assignments.loadPlants(customerId);
  }

  submit(): void {
    this.assignments.create(this.form);
  }

  createCustomer(): void {
    if (!this.newCustomer.name.trim()) {
      this.assignments.error.set('Nome cliente obbligatorio.');
      return;
    }
    this.assignments.createCustomer(this.newCustomer);
    this.newCustomer = { name: '', city: '', email: '', phone: '' };
  }

  createPlant(): void {
    if (!this.newPlant.customerId) {
      this.assignments.error.set('Seleziona un cliente per il nuovo impianto.');
      return;
    }
    this.assignments.createPlant(this.newPlant);
    this.newPlant = { customerId: '', serial: '', address: '', city: '', type: '' };
  }
}
