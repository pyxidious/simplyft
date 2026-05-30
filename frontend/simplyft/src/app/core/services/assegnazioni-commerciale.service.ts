import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { CommercialAssignment, CommercialCustomer, CommercialPlantOption, CommercialTechnician } from '../models/simplyft.models';

export interface CreateCommercialAssignment {
  technicianId: string;
  plantId: string;
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class AssegnazioniCommercialeService {
  technicians = signal<CommercialTechnician[]>([]);
  customers = signal<CommercialCustomer[]>([]);
  plants = signal<CommercialPlantOption[]>([]);
  assignments = signal<CommercialAssignment[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  ready = computed(() => !this.loading() && !this.error());

  constructor(private http: HttpClient) {}

  loadAssignmentsOnly(): void {
    this.loading.set(true);
    this.error.set('');
    this.http.get<CommercialAssignment[]>('/api/commerciale/assegnazioni').pipe(
      catchError(() => {
        this.error.set('Impossibile caricare le attivita assegnate.');
        return of([]);
      })
    ).subscribe((assignments) => {
      this.assignments.set(assignments);
      this.loading.set(false);
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      technicians: this.http.get<CommercialTechnician[]>('/api/commerciale/tecnici'),
      customers: this.http.get<CommercialCustomer[]>('/api/commerciale/clienti'),
      plants: this.http.get<CommercialPlantOption[]>('/api/commerciale/impianti'),
      assignments: this.http.get<CommercialAssignment[]>('/api/commerciale/assegnazioni')
    }).pipe(
      catchError(() => {
        this.error.set('Impossibile caricare le assegnazioni.');
        return of({ technicians: [], customers: [], plants: [], assignments: [] });
      })
    ).subscribe((data) => {
      this.technicians.set(data.technicians);
      this.customers.set(data.customers);
      this.plants.set(data.plants);
      this.assignments.set(data.assignments);
      this.loading.set(false);
    });
  }

  loadPlants(customerId: string): void {
    const params = customerId ? new HttpParams().set('customerId', customerId) : undefined;
    this.http.get<CommercialPlantOption[]>('/api/commerciale/impianti', { params }).pipe(
      catchError(() => of([]))
    ).subscribe((plants) => this.plants.set(plants));
  }

  create(payload: CreateCommercialAssignment): void {
    this.saving.set(true);
    this.error.set('');
    this.http.post<CommercialAssignment>('/api/commerciale/assegnazioni', payload).pipe(
      catchError(() => {
        this.error.set('Creazione assegnazione non riuscita.');
        return of(undefined);
      })
    ).subscribe((assignment) => {
      if (assignment) {
        this.assignments.update((items) => [assignment, ...items]);
      }
      this.saving.set(false);
    });
  }

  createCustomer(payload: Partial<CommercialCustomer> & { phone?: string }): void {
    this.http.post<CommercialCustomer>('/api/commerciale/clienti', payload).pipe(
      catchError(() => {
        this.error.set('Creazione cliente non riuscita.');
        return of(undefined);
      })
    ).subscribe((customer) => {
      if (customer) {
        this.customers.update((items) => [customer, ...items]);
      }
    });
  }

  updateCustomer(id: string, payload: Partial<CommercialCustomer> & { phone?: string }): void {
    this.http.patch<CommercialCustomer>(`/api/commerciale/clienti/${id}`, payload).pipe(
      catchError(() => {
        this.error.set('Modifica cliente non riuscita.');
        return of(undefined);
      })
    ).subscribe((customer) => {
      if (customer) {
        this.customers.update((items) => items.map((item) => item.id === id ? customer : item));
      }
    });
  }

  deleteCustomer(id: string): void {
    this.http.delete<void>(`/api/commerciale/clienti/${id}`).pipe(
      catchError(() => {
        this.error.set('Eliminazione cliente non riuscita.');
        return of(undefined);
      })
    ).subscribe(() => this.customers.update((items) => items.filter((item) => item.id !== id)));
  }

  createPlant(payload: Partial<CommercialPlantOption> & { serial?: string; city?: string }): void {
    this.http.post<CommercialPlantOption>('/api/commerciale/impianti', payload).pipe(
      catchError(() => {
        this.error.set('Creazione impianto non riuscita.');
        return of(undefined);
      })
    ).subscribe((plant) => {
      if (plant) {
        this.plants.update((items) => [plant, ...items]);
      }
    });
  }

  updatePlant(id: string, payload: Partial<CommercialPlantOption> & { serial?: string; city?: string }): void {
    this.http.patch<CommercialPlantOption>(`/api/commerciale/impianti/${id}`, payload).pipe(
      catchError(() => {
        this.error.set('Modifica impianto non riuscita.');
        return of(undefined);
      })
    ).subscribe((plant) => {
      if (plant) {
        this.plants.update((items) => items.map((item) => item.id === id ? plant : item));
      }
    });
  }

  deletePlant(id: string): void {
    this.http.delete<void>(`/api/commerciale/impianti/${id}`).pipe(
      catchError(() => {
        this.error.set('Eliminazione impianto non riuscita.');
        return of(undefined);
      })
    ).subscribe(() => this.plants.update((items) => items.filter((item) => item.id !== id)));
  }
}
