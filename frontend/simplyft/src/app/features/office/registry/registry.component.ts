import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommercialCustomer, CommercialPlantOption } from '../../../core/models/simplyft.models';
import { AssegnazioniCommercialeService } from '../../../core/services/assegnazioni-commerciale.service';

type RegistryTab = 'customers' | 'plants';
type RegistryModal = 'createCustomer' | 'editCustomer' | 'createPlant' | 'editPlant' | null;

@Component({
  selector: 'app-registry',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registry.component.html',
  styleUrl: './registry.component.css'
})
export class RegistryComponent implements OnInit {
  public assignments = inject(AssegnazioniCommercialeService);

  activeTab = signal<RegistryTab>('customers');
  activeModal = signal<RegistryModal>(null);
  search = signal('');
  selectedCustomerId = signal('');

  newCustomer = this.emptyCustomer();
  newPlant = this.emptyPlant();

  editingCustomerId = '';
  editingPlantId = '';
  customerEdit = this.emptyCustomer();
  plantEdit = this.emptyPlant();

  customerCount = computed(() => this.assignments.customers().length);
  plantCount = computed(() => this.assignments.plants().length);

  filteredCustomers = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.assignments.customers().filter((customer) => {
      const haystack = `${customer.name} ${customer.city} ${customer.email} ${customer.phone || ''}`.toLowerCase();
      return !term || haystack.includes(term);
    });
  });

  filteredPlants = computed(() => {
    const term = this.search().trim().toLowerCase();
    const selectedCustomerId = this.selectedCustomerId();

    return this.assignments.plants().filter((plant) => {
      const haystack = `${plant.customerName} ${plant.code} ${plant.serial || ''} ${plant.address} ${plant.city || ''} ${plant.type}`.toLowerCase();
      const matchesTerm = !term || haystack.includes(term);
      const matchesCustomer = !selectedCustomerId || plant.customerId === selectedCustomerId;
      return matchesTerm && matchesCustomer;
    });
  });

  ngOnInit(): void {
    this.assignments.load();
  }

  setTab(tab: RegistryTab): void {
    this.activeTab.set(tab);
    this.search.set('');
    this.selectedCustomerId.set('');
    this.closeModal();
  }

  openCreateModal(): void {
    this.cancelCustomerEdit();
    this.cancelPlantEdit();

    if (this.activeTab() === 'customers') {
      this.newCustomer = this.emptyCustomer();
      this.activeModal.set('createCustomer');
      return;
    }

    this.newPlant = this.emptyPlant();
    this.activeModal.set('createPlant');
  }

  closeModal(): void {
    this.activeModal.set(null);
    this.cancelCustomerEdit();
    this.cancelPlantEdit();
  }

  createCustomer(): void {
    if (!this.newCustomer.name.trim()) {
      this.assignments.error.set('Nome cliente obbligatorio.');
      return;
    }

    this.assignments.createCustomer(this.newCustomer);
    this.newCustomer = this.emptyCustomer();
    this.closeModal();
  }

  startCustomerEdit(customer: CommercialCustomer): void {
    this.editingPlantId = '';
    this.editingCustomerId = customer.id;
    this.customerEdit = {
      name: customer.name,
      city: customer.city,
      email: customer.email,
      phone: customer.phone || ''
    };
    this.activeModal.set('editCustomer');
  }

  saveCustomer(id: string): void {
    if (!this.customerEdit.name.trim()) {
      this.assignments.error.set('Nome cliente obbligatorio.');
      return;
    }

    this.assignments.updateCustomer(id, this.customerEdit);
    this.closeModal();
  }

  cancelCustomerEdit(): void {
    this.editingCustomerId = '';
    this.customerEdit = this.emptyCustomer();
  }

  deleteCustomer(id: string): void {
    this.assignments.deleteCustomer(id);
    if (this.selectedCustomerId() === id) {
      this.selectedCustomerId.set('');
    }
  }

  createPlant(): void {
    if (!this.newPlant.customerId) {
      this.assignments.error.set('Seleziona un cliente per il nuovo impianto.');
      return;
    }

    if (!this.newPlant.code.trim()) {
      this.assignments.error.set('Codice o matricola impianto obbligatoria.');
      return;
    }

    if (!this.newPlant.serial.trim()) {
      this.newPlant.serial = this.newPlant.code;
    }

    this.assignments.createPlant(this.newPlant);
    this.newPlant = this.emptyPlant();
    this.closeModal();
  }

  startPlantEdit(plant: CommercialPlantOption): void {
    this.editingCustomerId = '';
    this.editingPlantId = plant.id;
    this.plantEdit = {
      customerId: plant.customerId,
      code: plant.code,
      serial: plant.serial || plant.code,
      address: plant.address,
      city: plant.city || '',
      type: plant.type
    };
    this.activeModal.set('editPlant');
  }

  savePlant(id: string): void {
    if (!this.plantEdit.customerId || !this.plantEdit.code.trim()) {
      this.assignments.error.set('Cliente e codice impianto sono obbligatori.');
      return;
    }

    if (!this.plantEdit.serial.trim()) {
      this.plantEdit.serial = this.plantEdit.code;
    }

    this.assignments.updatePlant(id, this.plantEdit);
    this.closeModal();
  }

  cancelPlantEdit(): void {
    this.editingPlantId = '';
    this.plantEdit = this.emptyPlant();
  }

  deletePlant(id: string): void {
    this.assignments.deletePlant(id);
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  setSelectedCustomer(value: string): void {
    this.selectedCustomerId.set(value);
  }

  private emptyCustomer() {
    return { name: '', city: '', email: '', phone: '' };
  }

  private emptyPlant() {
    return { customerId: '', code: '', serial: '', address: '', city: '', type: '' };
  }
}
